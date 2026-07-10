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
  revalidatePath("/faturamento");
  redirect("/faturamento");
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
  revalidatePath("/faturamento");
}

export interface TransacaoImportada {
  cliente_id: string;
  valor: number;
  competencia: string; // "2026-04"
  data_emissao: string; // "2026-04-07"
  fitid: string;
  arquivo: string;
}

// Importação de extrato OFX: o parse acontece no navegador; aqui só grava,
// deduplicando pelo FITID do banco (guardado em arquivo_origem como "ofx:...").
export async function importarTransacoes(itens: TransacaoImportada[]) {
  const supabase = await createClient();
  if (itens.length === 0) return { inseridos: 0, pulados: 0 };

  const marcadores = itens.map((i) => `ofx:${i.fitid}`);
  const { data: existentes } = await supabase
    .from("fm_faturamento")
    .select("arquivo_origem")
    .in("arquivo_origem", marcadores);
  const jaImportados = new Set(
    (existentes ?? []).map((e) => e.arquivo_origem as string),
  );

  const novos = itens.filter((i) => !jaImportados.has(`ofx:${i.fitid}`));

  for (const item of novos) {
    const { error } = await supabase.from("fm_faturamento").insert({
      cliente_id: item.cliente_id,
      contrato_id: await contratoAtivoDoCliente(supabase, item.cliente_id),
      valor: item.valor,
      competencia: `${item.competencia}-01`,
      data_emissao: item.data_emissao,
      status: "concluido",
      arquivo_origem: `ofx:${item.fitid}`,
      importado_em: new Date().toISOString(),
    });
    if (error) throw new Error(`Erro ao importar: ${error.message}`);
  }

  revalidatePath("/faturamento");
  return { inseridos: novos.length, pulados: itens.length - novos.length };
}

export async function excluirFaturamento(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_faturamento").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir lançamento: ${error.message}`);
  revalidatePath("/faturamento");
}
