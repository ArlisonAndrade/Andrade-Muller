"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFaturaCSV, aplicarRegras } from "@/lib/bank/import-csv";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";

// 1º passo: lê o CSV, cria fatura + importação em status 'revisao' e os
// lancamentos_cartao (categorizados pelo que as regras alcançarem).
export async function iniciarImportacao(formData: FormData) {
  const supabase = await createClient();

  const cartao_id = String(formData.get("cartao_id"));
  const competenciaMes = String(formData.get("competencia")); // yyyy-MM
  const competencia = `${competenciaMes}-01`;
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || !cartao_id || !/^\d{4}-\d{2}$/.test(competenciaMes)) {
    redirect("/bank/importar-fatura?erro=dados");
  }

  const { linhas, ignoradas } = parseFaturaCSV(await arquivo.text());
  if (linhas.length === 0) {
    redirect("/bank/importar-fatura?erro=vazio");
  }

  // Fatura da competência (cria se não existir).
  const { data: faturaExistente } = await supabase
    .from("faturas_cartao")
    .select("id")
    .eq("cartao_id", cartao_id)
    .eq("competencia", competencia)
    .maybeSingle();
  let faturaId = faturaExistente?.id as string | undefined;
  if (!faturaId) {
    const { data: nova, error } = await supabase
      .from("faturas_cartao")
      .insert({ cartao_id, competencia, valor_total: 0 })
      .select("id")
      .single();
    if (error) throw new Error(`Falha ao criar fatura: ${error.message}`);
    faturaId = nova.id;
  }

  const { data: regras } = await supabase
    .from("regras_categorizacao")
    .select("padrao_texto, categoria_id, prioridade")
    .eq("entidade_id", ENTIDADE_FAMILIA);

  const lancamentos = linhas.map((l) => {
    const categoria = aplicarRegras(l.descricao, regras ?? []);
    return {
      fatura_id: faturaId,
      categoria_id: categoria,
      descricao: l.descricao,
      valor: l.valor,
      parcela_atual: l.parcela_atual,
      parcela_total: l.parcela_total,
      data: l.data,
      origem: "import_csv",
      categorizado_automaticamente: !!categoria,
    };
  });

  const { error: erroLanc } = await supabase.from("lancamentos_cartao").insert(lancamentos);
  if (erroLanc) throw new Error(`Falha ao gravar lançamentos: ${erroLanc.message}`);

  const categorizadas = lancamentos.filter((l) => l.categoria_id).length;
  const { data: importacao, error: erroImp } = await supabase
    .from("importacoes_fatura")
    .insert({
      fatura_id: faturaId,
      nome_arquivo: arquivo.name,
      total_linhas: linhas.length + ignoradas,
      linhas_categorizadas: categorizadas,
      linhas_pendentes: linhas.length - categorizadas,
      status: "revisao",
    })
    .select("id")
    .single();
  if (erroImp) throw new Error(`Falha ao registrar importação: ${erroImp.message}`);

  // Atualiza o total da fatura com a soma importada.
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  await supabase.from("faturas_cartao").update({ valor_total: total }).eq("id", faturaId);

  redirect(`/bank/importar-fatura/revisar/${importacao.id}`);
}

// Recategoriza um lançamento na tela de revisão; opcionalmente vira regra.
export async function categorizarLancamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("lancamento_id"));
  const categoria_id = String(formData.get("categoria_id") || "") || null;
  const importacaoId = String(formData.get("importacao_id"));

  const { error } = await supabase
    .from("lancamentos_cartao")
    .update({ categoria_id, categorizado_automaticamente: false })
    .eq("id", id);
  if (error) throw new Error(`Falha ao categorizar: ${error.message}`);

  if (categoria_id && String(formData.get("criar_regra")) === "on") {
    const padrao = String(formData.get("descricao") || "")
      .toUpperCase()
      // Padrão útil: primeiro bloco de texto sem números de parcela/datas.
      .replace(/(?:^|\s|-)\d{1,2}\s*\/\s*\d{1,2}(?:\s|$)/g, " ")
      .trim()
      .slice(0, 40);
    if (padrao.length >= 3) {
      const { data: existente } = await supabase
        .from("regras_categorizacao")
        .select("id")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .eq("padrao_texto", padrao)
        .maybeSingle();
      if (!existente) {
        await supabase.from("regras_categorizacao").insert({
          entidade_id: ENTIDADE_FAMILIA,
          padrao_texto: padrao,
          categoria_id,
          prioridade: 5, // regra criada pelo usuário vence as do seed
        });
      }
    }
  }

  revalidatePath(`/bank/importar-fatura/revisar/${importacaoId}`);
}

// 2º passo: confirma a importação — gera transacoes pros lançamentos
// categorizados, PULANDO o que já foi lançado no rápido (mesma data +
// valor + cartão) e vinculando via transacao_id. Regime "dia da compra".
export async function confirmarImportacao(formData: FormData) {
  const supabase = await createClient();
  const importacaoId = String(formData.get("importacao_id"));

  const { data: importacao } = await supabase
    .from("importacoes_fatura")
    .select("id, fatura_id, fatura:faturas_cartao(cartao_id)")
    .eq("id", importacaoId)
    .single();
  if (!importacao) throw new Error("Importação não encontrada.");
  const cartaoId = (importacao.fatura as unknown as { cartao_id: string }).cartao_id;

  const { data: lancamentos } = await supabase
    .from("lancamentos_cartao")
    .select("id, categoria_id, descricao, valor, data, transacao_id")
    .eq("fatura_id", importacao.fatura_id)
    .is("transacao_id", null)
    .not("categoria_id", "is", null);

  let gerados = 0;
  let vinculados = 0;
  for (const l of lancamentos ?? []) {
    // Dedupe: gasto igual (data+valor+cartão) já lançado manualmente.
    const { data: duplicada } = await supabase
      .from("transacoes")
      .select("id")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("cartao_id", cartaoId)
      .eq("data", l.data)
      .eq("valor", l.valor)
      .limit(1)
      .maybeSingle();

    let transacaoId = duplicada?.id as string | undefined;
    if (transacaoId) {
      vinculados++;
    } else {
      const { data: nova, error } = await supabase
        .from("transacoes")
        .insert({
          entidade_id: ENTIDADE_FAMILIA,
          categoria_id: l.categoria_id,
          descricao: l.descricao,
          valor: l.valor,
          data: l.data,
          forma_pagamento: "credito",
          cartao_id: cartaoId,
        })
        .select("id")
        .single();
      if (error) continue;
      transacaoId = nova.id;
      gerados++;
    }
    await supabase.from("lancamentos_cartao").update({ transacao_id: transacaoId }).eq("id", l.id);
  }

  const { count: pendentes } = await supabase
    .from("lancamentos_cartao")
    .select("id", { count: "exact", head: true })
    .eq("fatura_id", importacao.fatura_id)
    .is("categoria_id", null);

  await supabase
    .from("importacoes_fatura")
    .update({
      status: (pendentes ?? 0) > 0 ? "revisao" : "confirmada",
      linhas_pendentes: pendentes ?? 0,
    })
    .eq("id", importacaoId);

  redirect(`/bank/lancamentos?importados=${gerados}&vinculados=${vinculados}`);
}
