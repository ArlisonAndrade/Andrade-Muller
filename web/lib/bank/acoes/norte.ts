"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidar() {
  revalidatePath("/bank/norte");
  revalidatePath("/bank");
}

// ---- Renda das pessoas (salário-base médio) ----
export async function atualizarRendaPessoa(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const renda_base = Number(formData.get("renda_base") || 0);

  const { error } = await supabase.from("pessoas").update({ renda_base }).eq("id", id);
  if (error) throw new Error(`Falha ao salvar renda: ${error.message}`);
  revalidar();
}

// O "Método" do Notion é um único campo que mistura formas simples e cartões.
// No form o valor vem como `cartao:<id>` quando é cartão, senão é o texto puro.
function separarMetodo(raw: string): { metodo: string | null; cartao_id: string | null } {
  if (!raw) return { metodo: null, cartao_id: null };
  if (raw.startsWith("cartao:")) return { metodo: "Cartão", cartao_id: raw.slice(7) };
  return { metodo: raw, cartao_id: null };
}

function lerItem(formData: FormData) {
  const { metodo, cartao_id } = separarMetodo(String(formData.get("metodo") || ""));
  return {
    item: String(formData.get("item") || "").trim() || "Item",
    valor: Number(formData.get("valor") || 0),
    categoria_id: String(formData.get("categoria_id") || "") || null,
    grupo_orcamento: String(formData.get("grupo_orcamento") || "") || null,
    metodo,
    cartao_id,
    responsavel_id: String(formData.get("responsavel_id") || "") || null,
    obs: String(formData.get("obs") || "").trim() || null,
  };
}

export async function criarOrcamentoItem(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const { error } = await supabase
    .from("orcamento_planejado")
    .insert({ entidade_id, ...lerItem(formData) });
  if (error) throw new Error(`Falha ao adicionar item: ${error.message}`);
  revalidar();
}

export async function editarOrcamentoItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("orcamento_planejado")
    .update(lerItem(formData))
    .eq("id", id);
  if (error) throw new Error(`Falha ao editar item: ${error.message}`);
  revalidar();
}

export async function excluirOrcamentoItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("orcamento_planejado").delete().eq("id", id);
  if (error) throw new Error(`Falha ao excluir item: ${error.message}`);
  revalidar();
}
