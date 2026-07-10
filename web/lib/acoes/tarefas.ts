"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export async function salvarTarefa(fd: FormData) {
  const supabase = await createClient();
  const id = texto(fd, "id");
  const dados = {
    cliente_id: texto(fd, "cliente_id"),
    titulo: texto(fd, "titulo") ?? "(sem título)",
    responsavel: texto(fd, "responsavel"),
    prioridade: texto(fd, "prioridade") ?? "media",
    data_prazo: texto(fd, "data_prazo"),
    concluida: fd.get("concluida") === "on",
  };

  const { error } = id
    ? await supabase.from("fm_tarefas").update(dados).eq("id", id)
    : await supabase.from("fm_tarefas").insert(dados);

  if (error) throw new Error(`Erro ao salvar tarefa: ${error.message}`);
  revalidatePath("/tarefas");
  redirect("/tarefas");
}

export async function alternarConclusao(id: string, concluida: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fm_tarefas")
    .update({ concluida })
    .eq("id", id);
  if (error) throw new Error(`Erro ao atualizar tarefa: ${error.message}`);
  revalidatePath("/tarefas");
}

export async function excluirTarefa(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_tarefas").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir tarefa: ${error.message}`);
  revalidatePath("/tarefas");
  redirect("/tarefas");
}
