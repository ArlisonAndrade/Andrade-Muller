"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarLancamento(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const conta_id = String(formData.get("conta_id") || "") || null;
  const categoria_id = String(formData.get("categoria_id") || "") || null;
  const descricao = String(formData.get("descricao"));
  const valor = Number(formData.get("valor"));
  const data = String(formData.get("data"));

  await supabase.from("transacoes").insert({
    entidade_id,
    conta_id,
    categoria_id,
    descricao,
    valor,
    data,
  });

  redirect("/");
}
