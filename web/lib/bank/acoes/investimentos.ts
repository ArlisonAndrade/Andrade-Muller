"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { atualizarCotacoesB3 } from "@/lib/bank/cotacoes";
import { ENTIDADE_FAMILIA, ENTIDADE_ARTHUR } from "@/lib/bank/tipos";

// Garante o ativo (ticker é global, compartilhado entre entidades) e lança a
// movimentação de compra + a cotação atual inicial (preço da própria compra).
export async function criarInvestimento(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const ticker = String(formData.get("ticker")).toUpperCase().trim();
  const tipoAtivo = String(formData.get("tipo_ativo"));
  const nomeAtivo = String(formData.get("nome_ativo") || "") || null;
  const quantidade = Number(formData.get("quantidade"));
  const preco_unitario = Number(formData.get("preco_unitario"));
  const data = String(formData.get("data"));

  const { data: ativoExistente } = await supabase
    .from("ativos")
    .select("id")
    .eq("ticker", ticker)
    .maybeSingle();

  let ativoId = ativoExistente?.id as string | undefined;

  if (!ativoId) {
    const { data: novoAtivo } = await supabase
      .from("ativos")
      .insert({ ticker, tipo: tipoAtivo, nome: nomeAtivo })
      .select("id")
      .single();
    ativoId = novoAtivo?.id;
  }

  if (!ativoId) {
    redirect("/bank/investimentos/novo?erro=1");
  }

  await supabase.from("movimentacoes_ativos").insert({
    entidade_id,
    ativo_id: ativoId,
    tipo: "compra",
    quantidade,
    preco_unitario,
    data,
  });

  // Só inicializa a cotação se ainda não houver uma (não sobrescrever a do dia).
  const { data: cotacaoExistente } = await supabase
    .from("cotacoes_atuais")
    .select("ativo_id")
    .eq("ativo_id", ativoId)
    .maybeSingle();
  if (!cotacaoExistente) {
    await supabase
      .from("cotacoes_atuais")
      .upsert({ ativo_id: ativoId, preco_atual: preco_unitario }, { onConflict: "ativo_id" });
  }

  redirect("/bank/investimentos");
}

export async function registrarProvento(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("proventos").insert({
    entidade_id: String(formData.get("entidade_id")),
    ativo_id: String(formData.get("ativo_id") || "") || null,
    tipo: String(formData.get("tipo")),
    valor: Number(formData.get("valor")),
    data: String(formData.get("data")),
  });
  if (error) throw new Error(`Falha ao registrar provento: ${error.message}`);
  revalidatePath("/bank/investimentos");
}

// Atualização manual de preço — renda fixa, tesouro, fundos, cripto e
// internacional (o que a brapi B3 não cobre). Pra renda fixa o padrão é
// quantidade 1 × preço = valor atual do contrato.
export async function atualizarValorAtivo(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("cotacoes_atuais").upsert(
    {
      ativo_id: String(formData.get("ativo_id")),
      preco_atual: Number(formData.get("preco_atual")),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "ativo_id" },
  );
  if (error) throw new Error(`Falha ao atualizar valor: ${error.message}`);
  revalidatePath("/bank/investimentos");
}

// Botão "Atualizar cotações" — roda com a sessão do usuário (RLS de
// cotacoes_atuais permite upsert de membro autenticado).
export async function acaoAtualizarCotacoes() {
  const supabase = await createClient();
  await atualizarCotacoesB3(supabase);
  revalidatePath("/bank/investimentos");
  revalidatePath("/bank");
}

// Foto mensal do patrimônio investido — upsert idempotente por competência;
// re-executar no mesmo mês só refresca os valores. Chamada no load da
// página de investimentos e do dashboard.
export async function garantirSnapshotDoMes() {
  const supabase = await createClient();
  const hoje = new Date();
  const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: posicoes }, { data: cotacoes }, { data: contas }] = await Promise.all([
    supabase
      .from("posicao_ativos")
      .select("entidade_id, ativo_id, quantidade_atual, preco_medio")
      .in("entidade_id", [ENTIDADE_FAMILIA, ENTIDADE_ARTHUR]),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual"),
    supabase
      .from("contas")
      .select("entidade_id, saldo_inicial")
      .in("entidade_id", [ENTIDADE_FAMILIA, ENTIDADE_ARTHUR]),
  ]);

  const precoAtual = new Map(
    (cotacoes ?? []).map((c) => [c.ativo_id, Number(c.preco_atual ?? 0)]),
  );

  for (const entidade of [ENTIDADE_FAMILIA, ENTIDADE_ARTHUR]) {
    const daEntidade = (posicoes ?? []).filter(
      (p) => p.entidade_id === entidade && Number(p.quantidade_atual) > 0,
    );
    const valorAplicado = daEntidade.reduce(
      (s, p) => s + Number(p.quantidade_atual) * Number(p.preco_medio ?? 0),
      0,
    );
    const valorMercado = daEntidade.reduce((s, p) => {
      const preco = precoAtual.get(p.ativo_id) || Number(p.preco_medio ?? 0);
      return s + Number(p.quantidade_atual) * preco;
    }, 0);
    const saldoContas = (contas ?? [])
      .filter((c) => c.entidade_id === entidade)
      .reduce((s, c) => s + Number(c.saldo_inicial), 0);

    await supabase.from("snapshots_patrimonio").upsert(
      {
        entidade_id: entidade,
        competencia,
        valor_aplicado: valorAplicado,
        valor_mercado: valorMercado,
        saldo_contas: saldoContas,
      },
      { onConflict: "entidade_id,competencia" },
    );
  }
}
