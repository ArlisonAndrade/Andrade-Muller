"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cronogramaPrice } from "@/lib/bank/calculos-divida";

// Cria a dívida e, se vier taxa + nº de parcelas + 1º vencimento, gera o
// cronograma Price completo. `dividas` guarda o AGREGADO (valor_total =
// soma das parcelas a pagar) pra manter o card da home; a verdade parcela
// a parcela fica em parcelas_divida (ajustável na tela de detalhe pra
// bater com a tabela do contrato).
export async function criarDivida(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const descricao = String(formData.get("descricao"));
  const saldoDevedor = Number(formData.get("saldo_devedor"));
  const taxa = formData.get("taxa_juros_mensal") ? Number(formData.get("taxa_juros_mensal")) : null;
  const numParcelas = formData.get("parcelas_total") ? Number(formData.get("parcelas_total")) : null;
  const primeiroVencimento = String(formData.get("primeiro_vencimento") || "") || null;

  const gerarCronograma = !!(taxa != null && numParcelas && primeiroVencimento);
  const parcelas = gerarCronograma
    ? cronogramaPrice(saldoDevedor, taxa, numParcelas, primeiroVencimento)
    : [];
  const totalAPagar = gerarCronograma
    ? parcelas.reduce((s, p) => s + p.valor_parcela, 0)
    : saldoDevedor;

  const { data: divida, error } = await supabase
    .from("dividas")
    .insert({
      entidade_id,
      descricao,
      valor_total: Math.round(totalAPagar * 100) / 100,
      valor_pago: 0,
      taxa_juros_mensal: taxa,
      parcelas_total: numParcelas,
      parcelas_pagas: 0,
      data_vencimento_proxima: parcelas[0]?.data_vencimento ?? primeiroVencimento,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar dívida: ${error.message}`);

  if (parcelas.length > 0) {
    const { error: erroParcelas } = await supabase.from("parcelas_divida").insert(
      parcelas.map((p) => ({ divida_id: divida.id, ...p })),
    );
    if (erroParcelas) throw new Error(`Falha ao gerar parcelas: ${erroParcelas.message}`);
  }

  redirect(`/bank/dividas/${divida.id}`);
}

// Ajuste fino de uma parcela pra bater com a tabela do contrato
// (as do Santander variam de R$ 2.000 a 2.300).
export async function atualizarParcela(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("parcela_id"));
  const dividaId = String(formData.get("divida_id"));

  const valor_parcela = Number(formData.get("valor_parcela"));
  const valor_amortizacao = formData.get("valor_amortizacao")
    ? Number(formData.get("valor_amortizacao"))
    : null;
  const valor_juros =
    valor_amortizacao != null
      ? Math.round((valor_parcela - valor_amortizacao) * 100) / 100
      : null;

  const { error } = await supabase
    .from("parcelas_divida")
    .update({ valor_parcela, valor_amortizacao, valor_juros })
    .eq("id", id)
    .eq("paga", false);
  if (error) throw new Error(`Falha ao atualizar parcela: ${error.message}`);

  await sincronizarAgregado(dividaId);
  revalidatePath(`/bank/dividas/${dividaId}`);
}

// Baixa normal: paga a parcela pelo valor cheio.
export async function pagarParcela(formData: FormData) {
  const supabase = await createClient();
  const parcelaId = String(formData.get("parcela_id"));
  const dividaId = String(formData.get("divida_id"));
  const contaId = String(formData.get("conta_id") || "") || null;

  const { data: parcela } = await supabase
    .from("parcelas_divida")
    .select("id, numero, valor_parcela, paga, divida:dividas(entidade_id, descricao)")
    .eq("id", parcelaId)
    .single();
  if (!parcela || parcela.paga) redirect(`/bank/dividas/${dividaId}`);

  const divida = parcela!.divida as unknown as { entidade_id: string; descricao: string };
  const hoje = new Date().toISOString().slice(0, 10);

  let transacaoId: string | null = null;
  if (contaId) {
    const { data: t } = await supabase
      .from("transacoes")
      .insert({
        entidade_id: divida.entidade_id,
        conta_id: contaId,
        descricao: `${divida.descricao} — parcela ${parcela!.numero}`,
        valor: Number(parcela!.valor_parcela),
        data: hoje,
      })
      .select("id")
      .single();
    transacaoId = t?.id ?? null;
  }

  await supabase
    .from("parcelas_divida")
    .update({
      paga: true,
      paga_em: hoje,
      adiantada: false,
      valor_pago_efetivo: Number(parcela!.valor_parcela),
      transacao_id: transacaoId,
    })
    .eq("id", parcelaId);

  await sincronizarAgregado(dividaId);
  revalidatePath(`/bank/dividas/${dividaId}`);
  redirect(`/bank/dividas/${dividaId}`);
}

// Baixa ADIANTADA: quita a parcela do FIM do cronograma pagando só a
// amortização — o juro embutido é economia. É o movimento que encurta a
// dívida (Santander permite amortizar parcelas futuras pelo principal).
export async function adiantarParcela(formData: FormData) {
  const supabase = await createClient();
  const parcelaId = String(formData.get("parcela_id"));
  const dividaId = String(formData.get("divida_id"));
  const contaId = String(formData.get("conta_id") || "") || null;

  const { data: parcela } = await supabase
    .from("parcelas_divida")
    .select("id, numero, valor_parcela, valor_amortizacao, valor_juros, paga, divida:dividas(entidade_id, descricao)")
    .eq("id", parcelaId)
    .single();
  if (!parcela || parcela.paga) redirect(`/bank/dividas/${dividaId}`);

  const divida = parcela!.divida as unknown as { entidade_id: string; descricao: string };
  const hoje = new Date().toISOString().slice(0, 10);
  const valorPago = Number(parcela!.valor_amortizacao ?? parcela!.valor_parcela);
  const economia = Number(parcela!.valor_juros ?? 0);

  let transacaoId: string | null = null;
  if (contaId) {
    const { data: t } = await supabase
      .from("transacoes")
      .insert({
        entidade_id: divida.entidade_id,
        conta_id: contaId,
        descricao: `${divida.descricao} — adiantamento parcela ${parcela!.numero}`,
        valor: valorPago,
        data: hoje,
      })
      .select("id")
      .single();
    transacaoId = t?.id ?? null;
  }

  await supabase
    .from("parcelas_divida")
    .update({
      paga: true,
      paga_em: hoje,
      adiantada: true,
      valor_pago_efetivo: valorPago,
      transacao_id: transacaoId,
    })
    .eq("id", parcelaId);

  await sincronizarAgregado(dividaId);
  revalidatePath(`/bank/dividas/${dividaId}`);
  redirect(`/bank/dividas/${dividaId}?economia=${economia.toFixed(2)}`);
}

// Recalcula o agregado de `dividas` a partir das parcelas — fonte única
// de sincronia entre o detalhe e o card da home. Total a pagar cai quando
// uma parcela é adiantada (o juro dela sai da conta).
async function sincronizarAgregado(dividaId: string) {
  const supabase = await createClient();
  const { data: parcelas } = await supabase
    .from("parcelas_divida")
    .select("valor_parcela, valor_pago_efetivo, paga, adiantada, data_vencimento, numero")
    .eq("divida_id", dividaId);
  if (!parcelas || parcelas.length === 0) return;

  const pagas = parcelas.filter((p) => p.paga);
  const abertas = parcelas.filter((p) => !p.paga).sort((a, b) => a.numero - b.numero);
  const valorPago = pagas.reduce(
    (s, p) => s + Number(p.valor_pago_efetivo ?? p.valor_parcela),
    0,
  );
  const restante = abertas.reduce((s, p) => s + Number(p.valor_parcela), 0);

  await supabase
    .from("dividas")
    .update({
      valor_total: Math.round((valorPago + restante) * 100) / 100,
      valor_pago: Math.round(valorPago * 100) / 100,
      parcelas_total: parcelas.length,
      parcelas_pagas: pagas.length,
      data_vencimento_proxima: abertas[0]?.data_vencimento ?? null,
      quitada: abertas.length === 0,
    })
    .eq("id", dividaId);
}

// Compat: fluxo antigo de amortização livre (dívidas sem cronograma).
export async function amortizarDivida(formData: FormData) {
  const supabase = await createClient();

  const divida_id = String(formData.get("divida_id"));
  const valor_pagamento = Number(formData.get("valor_pagamento"));
  const parcelas_amortizadas = Number(formData.get("parcelas_amortizadas") || 1);
  const data = String(formData.get("data"));
  const conta_id = String(formData.get("conta_id") || "") || null;

  const { data: divida } = await supabase
    .from("dividas")
    .select("entidade_id, descricao, valor_total, valor_pago, parcelas_pagas, parcelas_total")
    .eq("id", divida_id)
    .single();

  if (!divida) redirect("/bank/dividas/nova?erro=1");

  const novoValorPago = Number(divida!.valor_pago) + valor_pagamento;
  const novasParcelasPagas = Number(divida!.parcelas_pagas ?? 0) + parcelas_amortizadas;
  const quitada = novoValorPago >= Number(divida!.valor_total);

  await supabase
    .from("dividas")
    .update({
      valor_pago: novoValorPago,
      parcelas_pagas: novasParcelasPagas,
      quitada,
    })
    .eq("id", divida_id);

  if (conta_id) {
    await supabase.from("transacoes").insert({
      entidade_id: divida!.entidade_id,
      conta_id,
      descricao: `Amortização — ${divida!.descricao}`,
      valor: valor_pagamento,
      data,
    });
  }

  redirect(`/bank/dividas/${divida_id}`);
}
