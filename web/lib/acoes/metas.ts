"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_ID } from "@/lib/tipos";

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

export async function salvarMeta(fd: FormData) {
  const supabase = await createClient();
  const id = texto(fd, "id");
  const dados = {
    objetivo: texto(fd, "objetivo") ?? "(sem objetivo)",
    key_result: texto(fd, "key_result") ?? "(sem key result)",
    trimestre: texto(fd, "trimestre"),
    valor_alvo: numero(fd, "valor_alvo"),
    valor_atual: numero(fd, "valor_atual"),
    status: texto(fd, "status") ?? "em_andamento",
  };

  const { error } = id
    ? await supabase.from("fm_metas_okrs").update(dados).eq("id", id)
    : await supabase
        .from("fm_metas_okrs")
        .insert({ ...dados, entidade_id: ENTIDADE_ID });

  if (error) throw new Error(`Erro ao salvar meta: ${error.message}`);
  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}

export async function excluirMeta(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_metas_okrs").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir meta: ${error.message}`);
  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}
