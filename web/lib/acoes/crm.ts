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

export async function salvarCliente(fd: FormData) {
  const supabase = await createClient();
  const id = texto(fd, "id");
  const dados = {
    empresa: texto(fd, "empresa"),
    nome_contato: texto(fd, "nome_contato") ?? "(sem nome)",
    email: texto(fd, "email"),
    whatsapp: texto(fd, "whatsapp"),
    status: texto(fd, "status") ?? "lead",
    fonte_lead: texto(fd, "fonte_lead"),
    responsavel_conta: texto(fd, "responsavel_conta") ?? "Franciele",
    tags:
      texto(fd, "tags")
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? null,
    endereco: texto(fd, "endereco"),
    ultimo_contato: texto(fd, "ultimo_contato"),
    observacoes: texto(fd, "observacoes"),
  };

  const { error } = id
    ? await supabase.from("fm_clientes").update(dados).eq("id", id)
    : await supabase
        .from("fm_clientes")
        .insert({ ...dados, entidade_id: ENTIDADE_ID });

  if (error) throw new Error(`Erro ao salvar cliente: ${error.message}`);
  revalidatePath("/crm");
  redirect("/crm");
}

export async function mudarStatusCliente(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fm_clientes")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(`Erro ao mover cliente: ${error.message}`);
  revalidatePath("/crm");
}

export async function excluirCliente(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_clientes").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir cliente: ${error.message}`);
  revalidatePath("/crm");
  redirect("/crm");
}

export async function salvarNegocio(fd: FormData) {
  const supabase = await createClient();
  const id = texto(fd, "id");
  const dados = {
    cliente_id: texto(fd, "cliente_id"),
    nome_negocio: texto(fd, "nome_negocio") ?? "(sem nome)",
    valor: Number(texto(fd, "valor")?.replace(/\./g, "").replace(",", ".") ?? 0) || 0,
    estagio: texto(fd, "estagio") ?? "prospeccao",
    data_prevista_fechamento: texto(fd, "data_prevista_fechamento"),
    data_fim_contrato: texto(fd, "data_fim_contrato"),
    proxima_acao: texto(fd, "proxima_acao"),
    proxima_acao_data: texto(fd, "proxima_acao_data"),
    risco_oportunidade: texto(fd, "risco_oportunidade"),
  };

  const { error } = id
    ? await supabase.from("fm_negocios").update(dados).eq("id", id)
    : await supabase.from("fm_negocios").insert(dados);

  if (error) throw new Error(`Erro ao salvar negócio: ${error.message}`);
  revalidatePath("/crm");
  redirect("/crm?aba=negocios");
}

export async function mudarEstagioNegocio(id: string, estagio: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fm_negocios")
    .update({ estagio })
    .eq("id", id);
  if (error) throw new Error(`Erro ao mover negócio: ${error.message}`);
  revalidatePath("/crm");
}

export async function excluirNegocio(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fm_negocios").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir negócio: ${error.message}`);
  revalidatePath("/crm");
  redirect("/crm?aba=negocios");
}
