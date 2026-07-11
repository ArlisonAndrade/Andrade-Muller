"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function numero(fd: FormData, campo: string): number {
  const s = texto(fd, campo);
  if (!s) return 0;
  return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
}

async function contratoAtivoDoCliente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string | null,
) {
  if (!clienteId) return null;
  const { data } = await supabase
    .from("fm_contratos")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Lançamento manual rápido de NFS-e já emitida (PRD 1.4)
export async function lancarNfse(fd: FormData) {
  const supabase = await createClient();
  const clienteId = texto(fd, "cliente_id");
  const competencia = texto(fd, "competencia"); // input type=month → "2026-07"

  const { error } = await supabase.from("fm_faturamento").insert({
    cliente_id: clienteId,
    contrato_id: await contratoAtivoDoCliente(supabase, clienteId),
    numero_nfse: texto(fd, "numero_nfse"),
    valor: numero(fd, "valor"),
    competencia: competencia ? `${competencia}-01` : null,
    data_emissao: texto(fd, "data_emissao"),
    status: texto(fd, "status") ?? "concluido",
  });

  if (error) throw new Error(`Erro ao lançar NFS-e: ${error.message}`);
  revalidatePath("/financeiro");
  redirect("/financeiro");
}

// Sugestão do mês: contrato recorrente sem lançamento na competência → 1 clique
export async function confirmarSugestao(fd: FormData) {
  const supabase = await createClient();
  const clienteId = texto(fd, "cliente_id");

  const { error } = await supabase.from("fm_faturamento").insert({
    cliente_id: clienteId,
    contrato_id: texto(fd, "contrato_id"),
    valor: numero(fd, "valor"),
    competencia: texto(fd, "competencia"),
    status: "pendente",
  });

  if (error) throw new Error(`Erro ao confirmar sugestão: ${error.message}`);
  revalidatePath("/financeiro");
}

export async function excluirFaturamento(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_faturamento").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir lançamento: ${error.message}`);
  revalidatePath("/financeiro");
}
