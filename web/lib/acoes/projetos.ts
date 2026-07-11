"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TemplateTarefa } from "@/lib/tipos";

function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Cria o projeto e gera o cronograma inteiro a partir da Biblioteca de
// Templates (o "esqueleto": cada template vira tarefa com prazo calculado
// a partir da data de início — o que no Notion era duplicação manual).
export async function criarProjeto(fd: FormData) {
  const supabase = await createClient();
  const clienteId = texto(fd, "cliente_id");
  const dataInicio = texto(fd, "data_inicio") ?? new Date().toISOString().slice(0, 10);
  const templateIds = fd.getAll("templates").map(String).filter(Boolean);

  const { data: projeto, error } = await supabase
    .from("fm_projetos")
    .insert({
      cliente_id: clienteId,
      nome: texto(fd, "nome") ?? "(sem nome)",
      descricao: texto(fd, "descricao"),
      data_inicio: dataInicio,
      data_fim_prevista: texto(fd, "data_fim_prevista"),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao criar projeto: ${error.message}`);

  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("fm_templates_tarefas")
      .select("*")
      .in("id", templateIds);

    const tarefas = ((templates ?? []) as TemplateTarefa[]).map((t) => ({
      cliente_id: clienteId,
      projeto_id: projeto.id,
      titulo: t.nome,
      responsavel: "Franciele",
      prioridade: t.prioridade,
      fase: t.fase,
      data_prazo: somarDias(dataInicio, t.prazo_dias),
    }));

    const { error: erroTarefas } = await supabase.from("fm_tarefas").insert(tarefas);
    if (erroTarefas)
      throw new Error(`Projeto criado, mas erro ao gerar cronograma: ${erroTarefas.message}`);
  }

  revalidatePath("/projetos");
  revalidatePath("/tarefas");
  revalidatePath("/");
  redirect(`/projetos/${projeto.id}`);
}

export async function mudarStatusProjeto(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_projetos").update({ status }).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar projeto: ${error.message}`);
  revalidatePath("/projetos");
  revalidatePath(`/projetos/${id}`);
  revalidatePath("/");
}

export async function excluirProjeto(id: string) {
  const supabase = await createClient();
  // As tarefas do cronograma sobrevivem (projeto_id vira null pelo FK)
  const { error } = await supabase.from("fm_projetos").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir projeto: ${error.message}`);
  revalidatePath("/projetos");
  redirect("/projetos");
}
