"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarConta(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const nome = String(formData.get("nome"));
  const tipo = String(formData.get("tipo"));
  const saldo_inicial = Number(formData.get("saldo_inicial") || 0);

  await supabase.from("contas").insert({
    entidade_id,
    nome,
    tipo,
    saldo_inicial,
  });

  redirect("/bank");
}
