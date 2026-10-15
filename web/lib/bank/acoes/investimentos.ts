"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sincronizarInvestidor10, type ResultadoSync } from "@/lib/bank/investidor10";
import { ENTIDADE_FAMILIA, ENTIDADE_ARTHUR } from "@/lib/bank/tipos";
import { classeDe, foraDaCorretora } from "@/lib/bank/classes-ativos";
import { hojeSP } from "@/lib/bank/agente/datas";

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

// Tira o ativo da carteira DESTA entidade. `ativos` é global (o ticker é
// compartilhado entre Família e Arthur), então o que some é a posição:
// movimentações e proventos da entidade. O ativo e a cotação só são
// apagados quando ninguém mais o tem — senão sumiria da carteira do outro.
export async function excluirPosicao(formData: FormData) {
  const supabase = await createClient();
  const ativoId = String(formData.get("id"));
  const entidadeId = String(formData.get("entidade_id"));

  const { error: erroMov } = await supabase
    .from("movimentacoes_ativos")
    .delete()
    .eq("ativo_id", ativoId)
    .eq("entidade_id", entidadeId);
  if (erroMov) return { erro: `Não deu pra excluir a posição: ${erroMov.message}` };

  await supabase
    .from("proventos")
    .delete()
    .eq("ativo_id", ativoId)
    .eq("entidade_id", entidadeId);

  // Nenhum FK de `ativos` é cascade — a ordem importa.
  const { count } = await supabase
    .from("movimentacoes_ativos")
    .select("id", { count: "exact", head: true })
    .eq("ativo_id", ativoId);
  if (!count) {
    await supabase.from("cotacoes_atuais").delete().eq("ativo_id", ativoId);
    await supabase.from("ativos").delete().eq("id", ativoId);
  }

  revalidatePath("/bank/investimentos");
  revalidatePath("/bank");
}

// Botão "Sincronizar com o Investidor10" — roda com a sessão do usuário.
// Devolve o resultado pra tela mostrar o que mudou (ou por que falhou).
export async function acaoSincronizarInvestidor10(): Promise<ResultadoSync> {
  const supabase = await createClient();
  const resultado = await sincronizarInvestidor10(supabase, "manual");
  revalidatePath("/bank/investimentos");
  revalidatePath("/bank/plano");
  revalidatePath("/bank");
  return resultado;
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
      .select("entidade_id, ativo_id, tipo, quantidade_atual, preco_medio")
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
    // A foto mensal é da CARTEIRA: ouro e cofres (migration 26) ficam de fora,
    // senão a série salta R$ 21 mil no mês em que foram cadastrados e a
    // rentabilidade 12M, a "Evolução da carteira" e o slide "O que construímos"
    // passam a medir um degrau que nunca aconteceu.
    const daEntidade = (posicoes ?? []).filter(
      (p) =>
        p.entidade_id === entidade &&
        Number(p.quantidade_atual) > 0 &&
        !foraDaCorretora(classeDe(p.tipo)),
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

// Mexer no saldo de uma posição MANUAL (o cofre de casa, a conta do Arthur) —
// pedido do Arlison, 15/out/2026: "preciso que nessa aba estendida tenha a
// opção de eu adicionar dinheiro". É a exceção consciente ao "sem lançamento
// manual" de 01/out: esse dinheiro não existe em nenhuma fonte automática, só
// ele sabe quanto tem no cofre.
//
// Nessas posições a quantidade É o valor em reais (preço 1,00), então mexer no
// saldo é mexer na quantidade. "Adicionar" e "retirar" também registram em
// `movimentos_carteira`, porque é dinheiro novo entrando (ou saindo) e o
// aporte do mês conta isso; "corrigir" só acerta o número, sem virar aporte —
// é pra quando a contagem estava errada.
export async function mexerNoSaldoManual(formData: FormData) {
  const supabase = await createClient();
  const ativoId = String(formData.get("ativo_id"));
  const operacao = String(formData.get("operacao")) as "adicionar" | "retirar" | "corrigir";
  const valor = Number(String(formData.get("valor")).replace(",", "."));
  if (!ativoId || !Number.isFinite(valor) || valor <= 0) return;

  const { data: ativo } = await supabase
    .from("ativos")
    .select("id, ticker, nome, tipo, origem, origem_ref")
    .eq("id", ativoId)
    .maybeSingle();
  // Só posição manual: a espelhada do Investidor10 seria sobrescrita na
  // sincronização seguinte, e o lançamento ainda abortaria a próxima rodada.
  if (!ativo || ativo.origem !== "manual") return;

  const { data: mov } = await supabase
    .from("movimentacoes_ativos")
    .select("id, quantidade")
    .eq("ativo_id", ativoId)
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("origem", "manual")
    .maybeSingle();
  if (!mov) return;

  const saldoAtual = Number(mov.quantidade);
  const novoSaldo =
    operacao === "corrigir" ? valor : operacao === "retirar" ? saldoAtual - valor : saldoAtual + valor;
  if (novoSaldo < 0) return;

  const { error } = await supabase
    .from("movimentacoes_ativos")
    .update({ quantidade: novoSaldo })
    .eq("id", mov.id);
  if (error) throw new Error(`Não deu pra atualizar o saldo: ${error.message}`);

  if (operacao !== "corrigir") {
    await supabase.from("movimentos_carteira").insert({
      entidade_id: ENTIDADE_FAMILIA,
      data: hojeSP(),
      ativo_ref: ativo.origem_ref,
      ticker: ativo.nome ?? ativo.ticker,
      tipo: operacao === "adicionar" ? "entrada" : "retirada",
      valor,
      origem: "manual",
      // Retirada nunca é anunciada no grupo (lib/bank/aporte-anuncio.ts).
      anunciado_em: operacao === "retirar" ? new Date().toISOString() : null,
    });
  }

  revalidatePath("/bank/investimentos");
  revalidatePath("/bank/plano");
  revalidatePath("/bank");
}
