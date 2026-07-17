"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  sincronizarEventoDaReuniao,
  removerEvento,
} from "@/lib/google/calendar";
import type { Reuniao } from "@/lib/tipos";

function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export async function salvarReuniao(fd: FormData) {
  const supabase = await createClient();
  const id = texto(fd, "id");
  const dados = {
    cliente_id: texto(fd, "cliente_id"),
    projeto_id: texto(fd, "projeto_id"),
    titulo: texto(fd, "titulo") ?? "(sem título)",
    tipo: texto(fd, "tipo"),
    status: texto(fd, "status") ?? "agendada",
    data_reuniao: texto(fd, "data_reuniao"),
    ata: texto(fd, "ata"),
    decisoes_tomadas: texto(fd, "decisoes_tomadas"),
    proximos_passos: texto(fd, "proximos_passos"),
    acoes_definidas: texto(fd, "acoes_definidas"),
  };

  let reuniaoId = id;
  if (id) {
    const { error } = await supabase.from("fm_reunioes").update(dados).eq("id", id);
    if (error) throw new Error(`Erro ao salvar reunião: ${error.message}`);
  } else {
    const { data, error } = await supabase
      .from("fm_reunioes")
      .insert(dados)
      .select("id")
      .single();
    if (error) throw new Error(`Erro ao salvar reunião: ${error.message}`);
    reuniaoId = data.id;
  }

  // Espelha no Google Agenda se conectado. A função é silenciosa: qualquer
  // falha do Google não pode impedir o salvamento da reunião.
  if (reuniaoId) {
    const { data: r } = await supabase
      .from("fm_reunioes")
      .select("*, cliente:fm_clientes(empresa, nome_contato)")
      .eq("id", reuniaoId)
      .single();
    if (r) {
      const { gcalEventId } = await sincronizarEventoDaReuniao(r as Reuniao);
      if (gcalEventId !== (r.gcal_event_id ?? null)) {
        await supabase
          .from("fm_reunioes")
          .update({ gcal_event_id: gcalEventId })
          .eq("id", reuniaoId);
      }
    }
  }

  revalidatePath("/reunioes");
  redirect("/reunioes");
}

export async function excluirReuniao(id: string) {
  const supabase = await createClient();
  // Guarda o vínculo do Google antes de apagar, para remover o evento depois.
  const { data: r } = await supabase
    .from("fm_reunioes")
    .select("gcal_event_id")
    .eq("id", id)
    .maybeSingle();
  // Tarefas nascidas da reunião continuam existindo, só perdem o vínculo
  // (sem isso a FK reuniao_origem_id impediria a exclusão).
  await supabase
    .from("fm_tarefas")
    .update({ reuniao_origem_id: null })
    .eq("reuniao_origem_id", id);
  const { error } = await supabase.from("fm_reunioes").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir reunião: ${error.message}`);
  if (r?.gcal_event_id) await removerEvento(r.gcal_event_id);
  revalidatePath("/reunioes");
  redirect("/reunioes");
}

// PRD 1.2: ação definida em reunião vira tarefa com um clique, sem redigitar.
export async function criarTarefaDaReuniao(fd: FormData) {
  const supabase = await createClient();
  const reuniaoId = texto(fd, "reuniao_id");
  const dados = {
    cliente_id: texto(fd, "cliente_id"),
    reuniao_origem_id: reuniaoId,
    titulo: texto(fd, "titulo") ?? "(sem título)",
    responsavel: texto(fd, "responsavel") ?? "Franciele",
    prioridade: texto(fd, "prioridade") ?? "media",
    data_prazo: texto(fd, "data_prazo"),
  };

  const { error } = await supabase.from("fm_tarefas").insert(dados);
  if (error) throw new Error(`Erro ao criar tarefa: ${error.message}`);
  revalidatePath(`/reunioes/${reuniaoId}`);
  revalidatePath("/tarefas");
}
