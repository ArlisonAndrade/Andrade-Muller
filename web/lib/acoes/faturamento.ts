"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// O lançamento manual de NFS-e e a "sugestão do mês" (1 clique) saíram em
// 01/out/2026 — nota entra só pelo "Subir NFS-e" (lib/acoes/notas.ts), com o
// PDF original. Fica a exclusão, pra corrigir lançamento errado.
export async function excluirFaturamento(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_faturamento").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir lançamento: ${error.message}`);
  revalidatePath("/financeiro");
}
