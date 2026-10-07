"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rendaSalvaPorTipo } from "@/lib/bank/renda";

// Reconcile on-load: garante que toda recorrência ativa com dia_do_mes já
// alcançado tenha a transação da competência corrente. Idempotente — o
// unique index (recorrencia_id, competencia_recorrencia) é o backstop e a
// checagem prévia evita o erro no caminho comum. Chamada no load da home;
// roda sob a sessão do usuário (RLS), então só enxerga/gera o que ele pode
// ver. Sem cron: app pessoal de uso frequente.
export async function gerarRecorrenciasPendentes() {
  const supabase = await createClient();

  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: recorrencias } = await supabase
    .from("recorrencias")
    .select("id, entidade_id, descricao, valor, categoria_id, conta_id, cartao_id, forma_pagamento, dia_do_mes, data_inicio, data_fim, vinculo_renda")
    .eq("ativa", true)
    .lte("dia_do_mes", diaHoje);
  if (!recorrencias || recorrencias.length === 0) return;

  const vigentes = recorrencias.filter((r) => {
    const dataOcorrencia = `${competencia.slice(0, 8)}${String(r.dia_do_mes).padStart(2, "0")}`;
    return r.data_inicio <= dataOcorrencia && (!r.data_fim || r.data_fim >= dataOcorrencia);
  });
  if (vigentes.length === 0) return;

  const { data: jaGeradas } = await supabase
    .from("transacoes")
    .select("recorrencia_id")
    .eq("competencia_recorrencia", competencia)
    .in("recorrencia_id", vigentes.map((r) => r.id));
  const geradas = new Set((jaGeradas ?? []).map((t) => t.recorrencia_id));

  // Salário não tem valor próprio: vale o que está salvo em Planejamento
  // (migration 27). Eram duas verdades sobre o mesmo dinheiro — a recorrência
  // ficou congelada em ago/2026 e o Arkad anunciou o valor velho no grupo.
  const comVinculo = vigentes.filter((r) => r.vinculo_renda);
  const rendaSalva = comVinculo.length
    ? await rendaSalvaPorTipo(supabase, competencia, comVinculo[0].entidade_id)
    : new Map();
  const valorDe = (r: (typeof vigentes)[number]) =>
    r.vinculo_renda ? (rendaSalva.get(r.vinculo_renda)?.valor ?? Number(r.valor)) : Number(r.valor);

  // O salário do mês pode ter sido editado depois do dia 5, com o lançamento
  // já gerado: alinha o que ficou para trás em vez de deixar dois números.
  for (const r of comVinculo.filter((r) => geradas.has(r.id))) {
    await supabase
      .from("transacoes")
      .update({ valor: valorDe(r) })
      .eq("recorrencia_id", r.id)
      .eq("competencia_recorrencia", competencia)
      .neq("valor", valorDe(r));
  }

  const pendentes = vigentes.filter((r) => !geradas.has(r.id));
  if (pendentes.length === 0) return;

  // Inserts individuais: se duas abas gerarem ao mesmo tempo, o unique index
  // derruba só a duplicada, sem abortar as demais.
  for (const r of pendentes) {
    await supabase.from("transacoes").insert({
      entidade_id: r.entidade_id,
      conta_id: r.conta_id,
      categoria_id: r.categoria_id,
      descricao: r.descricao,
      valor: valorDe(r),
      data: `${competencia.slice(0, 8)}${String(r.dia_do_mes).padStart(2, "0")}`,
      forma_pagamento: r.forma_pagamento,
      cartao_id: r.cartao_id,
      recorrente: true,
      recorrencia_id: r.id,
      competencia_recorrencia: competencia,
    });
  }
}
