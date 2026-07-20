"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function criarRecorrencia(formData: FormData) {
  const supabase = await createClient();

  const forma_pagamento = String(formData.get("forma_pagamento") || "") || null;
  const { error } = await supabase.from("recorrencias").insert({
    entidade_id: String(formData.get("entidade_id")),
    descricao: String(formData.get("descricao")),
    valor: Number(formData.get("valor")),
    categoria_id: String(formData.get("categoria_id") || "") || null,
    conta_id: String(formData.get("conta_id") || "") || null,
    cartao_id:
      forma_pagamento === "credito"
        ? String(formData.get("cartao_id") || "") || null
        : null,
    forma_pagamento,
    dia_do_mes: Number(formData.get("dia_do_mes")),
  });
  if (error) throw new Error(`Falha ao criar recorrência: ${error.message}`);

  revalidatePath("/bank/lancamentos");
}

export async function alternarRecorrencia(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const ativa = String(formData.get("ativa")) === "true";

  const { error } = await supabase
    .from("recorrencias")
    .update({ ativa: !ativa, ...(ativa ? { data_fim: new Date().toISOString().slice(0, 10) } : { data_fim: null }) })
    .eq("id", id);
  if (error) throw new Error(`Falha ao atualizar recorrência: ${error.message}`);

  revalidatePath("/bank/lancamentos");
}

// Reconcile on-load: garante que toda recorrência ativa com dia_do_mes já
// alcançado tenha a transação da competência corrente. Idempotente — o
// unique index (recorrencia_id, competencia_recorrencia) é o backstop e a
// checagem prévia evita o erro no caminho comum. Chamada no load da home e
// do extrato; roda sob a sessão do usuário (RLS), então só enxerga/gera o
// que ele pode ver. Sem cron: app pessoal de uso frequente.
export async function gerarRecorrenciasPendentes() {
  const supabase = await createClient();

  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: recorrencias } = await supabase
    .from("recorrencias")
    .select("id, entidade_id, descricao, valor, categoria_id, conta_id, cartao_id, forma_pagamento, dia_do_mes, data_inicio, data_fim")
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
      valor: r.valor,
      data: `${competencia.slice(0, 8)}${String(r.dia_do_mes).padStart(2, "0")}`,
      forma_pagamento: r.forma_pagamento,
      cartao_id: r.cartao_id,
      recorrente: true,
      recorrencia_id: r.id,
      competencia_recorrencia: competencia,
    });
  }
}
