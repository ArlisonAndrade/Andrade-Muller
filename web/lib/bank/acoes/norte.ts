"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PRESETS_DIVISAO } from "@/lib/bank/tipos";

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

// ---- Divisão 50/30/20 ----
export async function selecionarDivisaoPreset(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const preset = String(formData.get("preset"));
  const p = PRESETS_DIVISAO.find((x) => x.valor === preset);
  if (!p) throw new Error("Divisão inválida.");

  const { error } = await supabase.from("divisao_orcamento_config").upsert(
    {
      entidade_id,
      preset: p.valor,
      pct_essencial: p.pct_essencial,
      pct_liberdade: p.pct_liberdade,
      pct_investimento: p.pct_investimento,
      pct_extra: 0,
      extra_nome: null,
    },
    { onConflict: "entidade_id" },
  );
  if (error) throw new Error(`Falha ao selecionar divisão: ${error.message}`);
  revalidar();
}

export async function salvarDivisaoPersonalizada(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const pct_essencial = Number(formData.get("pct_essencial") || 0);
  const pct_liberdade = Number(formData.get("pct_liberdade") || 0);
  const pct_investimento = Number(formData.get("pct_investimento") || 0);
  const pct_extra = Number(formData.get("pct_extra") || 0);
  const extra_nome = String(formData.get("extra_nome") || "").trim() || null;

  const soma = pct_essencial + pct_liberdade + pct_investimento + pct_extra;
  if (Math.round(soma) !== 100) {
    throw new Error(`As porcentagens somam ${soma}% — precisam somar 100%.`);
  }

  const { error } = await supabase.from("divisao_orcamento_config").upsert(
    {
      entidade_id,
      preset: "personalizada",
      pct_essencial,
      pct_liberdade,
      pct_investimento,
      pct_extra,
      extra_nome,
    },
    { onConflict: "entidade_id" },
  );
  if (error) throw new Error(`Falha ao salvar divisão personalizada: ${error.message}`);
  revalidar();
}

// ---- Divisão dos pagamentos (itens do orçamento) ----
// O "Método" do form vem como `cartao:<id>` quando é cartão, senão texto puro.
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
    transferencia: formData.get("transferencia") === "on",
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
