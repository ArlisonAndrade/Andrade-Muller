"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarMeta(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const titulo = String(formData.get("titulo"));
  const valor_alvo = Number(formData.get("valor_alvo"));
  const valor_atual = Number(formData.get("valor_atual") || 0);
  const data_alvo = String(formData.get("data_alvo") || "") || null;

  await supabase.from("metas").insert({
    entidade_id,
    titulo,
    valor_alvo,
    valor_atual,
    data_alvo,
  });

  redirect("/bank");
}
