"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function numeroOuNulo(fd: FormData, campo: string): number | null {
  const s = texto(fd, campo);
  if (!s) return null;
  return Number(s.replace(/\./g, "").replace(",", ".")) || null;
}

export async function salvarContrato(fd: FormData) {
  const supabase = await createClient();
  const id = texto(fd, "id");
  const dados = {
    cliente_id: texto(fd, "cliente_id"),
    tipo: texto(fd, "tipo") ?? "mensal_recorrente",
    valor_mensal: numeroOuNulo(fd, "valor_mensal"),
    valor_total_contrato: numeroOuNulo(fd, "valor_total_contrato"),
    data_inicio: texto(fd, "data_inicio"),
    data_fim: texto(fd, "data_fim"),
    ativo: fd.get("ativo") === "on",
  };

  const { error } = id
    ? await supabase.from("fm_contratos").update(dados).eq("id", id)
    : await supabase.from("fm_contratos").insert(dados);

  if (error) throw new Error(`Erro ao salvar contrato: ${error.message}`);
  revalidatePath("/contratos");
  redirect("/contratos");
}

export async function excluirContrato(id: string) {
  const supabase = await createClient();
  // Lançamentos de faturamento apontam para o contrato — solta o vínculo antes.
  await supabase
    .from("fm_faturamento")
    .update({ contrato_id: null })
    .eq("contrato_id", id);
  const { error } = await supabase.from("fm_contratos").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir contrato: ${error.message}`);
  revalidatePath("/contratos");
  redirect("/contratos");
}
