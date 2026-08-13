"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Salva parâmetros de simulador (chave/valor) da entidade.
// Campos do form: entidade_id, caminho (path pra revalidar) e pares
// param_<chave>=<valor numérico>.
export async function salvarParametrosPlano(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const caminho = String(formData.get("caminho") || "/bank/plano");

  const linhas: Array<{ entidade_id: string; chave: string; valor: number }> = [];
  for (const [nome, bruto] of formData.entries()) {
    if (!nome.startsWith("param_")) continue;
    const valor = Number(bruto);
    if (!Number.isFinite(valor)) continue;
    linhas.push({ entidade_id, chave: nome.slice("param_".length), valor });
  }
  if (linhas.length > 0) {
    const { error } = await supabase
      .from("parametros_plano")
      .upsert(linhas, { onConflict: "entidade_id,chave" });
    if (error) throw new Error(`Falha ao salvar parâmetros: ${error.message}`);
  }
  revalidatePath(caminho);
}
