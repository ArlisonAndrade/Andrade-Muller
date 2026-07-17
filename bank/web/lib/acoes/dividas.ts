"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarDivida(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const descricao = String(formData.get("descricao"));
  const valor_total = Number(formData.get("valor_total"));
  const valor_pago = Number(formData.get("valor_pago") || 0);
  const taxa_juros_mensal = formData.get("taxa_juros_mensal")
    ? Number(formData.get("taxa_juros_mensal"))
    : null;
  const parcelas_total = formData.get("parcelas_total")
    ? Number(formData.get("parcelas_total"))
    : null;
  const parcelas_pagas = Number(formData.get("parcelas_pagas") || 0);
  const data_vencimento_proxima = String(formData.get("data_vencimento_proxima") || "") || null;

  await supabase.from("dividas").insert({
    entidade_id,
    descricao,
    valor_total,
    valor_pago,
    taxa_juros_mensal,
    parcelas_total,
    parcelas_pagas,
    data_vencimento_proxima,
  });

  redirect("/");
}

// Registra um pagamento (amortização) contra uma dívida existente: soma o
// valor pago, avança as parcelas e opcionalmente lança a saída de caixa como
// transação na conta escolhida — assim o patrimônio reflete o pagamento.
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

  if (!divida) redirect("/dividas/nova?erro=1");

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

  redirect("/");
}
