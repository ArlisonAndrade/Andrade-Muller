"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import type { Compromisso } from "@/lib/bank/trimestre";

const TRIMESTRE = /^\d{4}-T[1-4]$/;

function limpar(compromissos: Compromisso[]): Compromisso[] {
  return compromissos
    .map((c) => ({ texto: String(c.texto ?? "").trim().slice(0, 300), cumprido: c.cumprido ?? null }))
    .filter((c) => c.texto.length > 0)
    .slice(0, 12);
}

/**
 * Salva a reunião do trimestre: os compromissos combinados pro trimestre
 * seguinte e as notas. E grava, na reunião anterior, se o que tinha sido
 * combinado lá foi cumprido — é o que fecha o ciclo de uma reunião pra outra.
 */
export async function salvarReuniaoTrimestral(dados: {
  trimestre: string;
  compromissos: Compromisso[];
  notas: string;
  trimestreAnterior: string;
  conferidos: Compromisso[];
}) {
  if (!TRIMESTRE.test(dados.trimestre) || !TRIMESTRE.test(dados.trimestreAnterior)) {
    throw new Error("Trimestre inválido.");
  }
  const supabase = await createClient();

  const { error } = await supabase.from("reunioes_trimestrais").upsert(
    {
      entidade_id: ENTIDADE_FAMILIA,
      trimestre: dados.trimestre,
      compromissos: limpar(dados.compromissos),
      notas: dados.notas.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entidade_id,trimestre" },
  );
  if (error) throw new Error(`Falha ao salvar a reunião: ${error.message}`);

  if (dados.conferidos.length > 0) {
    const { error: erroAnterior } = await supabase
      .from("reunioes_trimestrais")
      .update({ compromissos: limpar(dados.conferidos), updated_at: new Date().toISOString() })
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("trimestre", dados.trimestreAnterior);
    if (erroAnterior) throw new Error(`Falha ao conferir os compromissos: ${erroAnterior.message}`);
  }

  revalidatePath("/bank/tv");
}
