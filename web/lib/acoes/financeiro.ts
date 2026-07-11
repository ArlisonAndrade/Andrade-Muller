"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_ID, CONTA_PADRAO_ID } from "@/lib/tipos";

function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export async function salvarTransacao(fd: FormData) {
  const supabase = await createClient();
  const id = texto(fd, "id");
  const dados = {
    conta_id: texto(fd, "conta_id") ?? CONTA_PADRAO_ID,
    categoria_id: texto(fd, "categoria_id"),
    descricao: texto(fd, "descricao") ?? "(sem descrição)",
    valor: Number(texto(fd, "valor")?.replace(/\./g, "").replace(",", ".") ?? 0) || 0,
    data: texto(fd, "data"),
    recorrente: fd.get("recorrente") === "on",
  };

  const { error } = id
    ? await supabase.from("transacoes").update(dados).eq("id", id)
    : await supabase
        .from("transacoes")
        .insert({ ...dados, entidade_id: ENTIDADE_ID });

  if (error) throw new Error(`Erro ao salvar lançamento: ${error.message}`);
  revalidatePath("/financeiro");
  redirect("/financeiro");
}

export async function excluirTransacao(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transacoes").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir lançamento: ${error.message}`);
  revalidatePath("/financeiro");
  redirect("/financeiro");
}

export interface ItemExtrato {
  fitid: string;
  data: string; // "2026-04-07"
  valor: number; // sempre positivo
  descricao: string;
  categoria_id: string;
}

// Importação de extrato OFX → caixa (transacoes). Entradas E saídas.
// Dedupe pelo FITID do banco (coluna ofx_fitid, índice único).
export async function importarExtrato(itens: ItemExtrato[]) {
  const supabase = await createClient();
  if (itens.length === 0) return { inseridos: 0, pulados: 0 };

  const { data: existentes } = await supabase
    .from("transacoes")
    .select("ofx_fitid")
    .in("ofx_fitid", itens.map((i) => i.fitid));
  const jaImportados = new Set((existentes ?? []).map((e) => e.ofx_fitid));

  const novos = itens.filter((i) => !jaImportados.has(i.fitid));
  if (novos.length > 0) {
    const { error } = await supabase.from("transacoes").insert(
      novos.map((i) => ({
        entidade_id: ENTIDADE_ID,
        conta_id: CONTA_PADRAO_ID,
        categoria_id: i.categoria_id,
        descricao: i.descricao.slice(0, 500),
        valor: i.valor,
        data: i.data,
        ofx_fitid: i.fitid,
      })),
    );
    if (error) throw new Error(`Erro ao importar extrato: ${error.message}`);
  }

  revalidatePath("/financeiro");
  return { inseridos: novos.length, pulados: itens.length - novos.length };
}
