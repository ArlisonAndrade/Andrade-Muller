"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function editarLancamento(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));
  const descricao = String(formData.get("descricao") || "").trim() || "Lançamento";
  const valor = Number(formData.get("valor"));
  const data = String(formData.get("data"));
  const categoria_id = String(formData.get("categoria_id") || "") || null;

  const { error } = await supabase
    .from("transacoes")
    .update({ descricao, valor, data, categoria_id })
    .eq("id", id);
  if (error) throw new Error(`Falha ao editar: ${error.message}`);

  revalidatePath("/bank/semanas");
  revalidatePath("/bank");
}

export async function excluirLancamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("transacoes").delete().eq("id", id);
  if (error) throw new Error(`Falha ao excluir: ${error.message}`);

  revalidatePath("/bank/semanas");
  revalidatePath("/bank");
}
