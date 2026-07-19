"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Garante o ativo (ticker é global, compartilhado entre entidades) e lança a
// movimentação de compra + a cotação atual inicial (preço da própria compra).
export async function criarInvestimento(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const ticker = String(formData.get("ticker")).toUpperCase().trim();
  const tipoAtivo = String(formData.get("tipo_ativo"));
  const nomeAtivo = String(formData.get("nome_ativo") || "") || null;
  const quantidade = Number(formData.get("quantidade"));
  const preco_unitario = Number(formData.get("preco_unitario"));
  const data = String(formData.get("data"));

  const { data: ativoExistente } = await supabase
    .from("ativos")
    .select("id")
    .eq("ticker", ticker)
    .maybeSingle();

  let ativoId = ativoExistente?.id as string | undefined;

  if (!ativoId) {
    const { data: novoAtivo } = await supabase
      .from("ativos")
      .insert({ ticker, tipo: tipoAtivo, nome: nomeAtivo })
      .select("id")
      .single();
    ativoId = novoAtivo?.id;
  }

  if (!ativoId) {
    redirect("/bank/investimentos/novo?erro=1");
  }

  await supabase.from("movimentacoes_ativos").insert({
    entidade_id,
    ativo_id: ativoId,
    tipo: "compra",
    quantidade,
    preco_unitario,
    data,
  });

  await supabase
    .from("cotacoes_atuais")
    .upsert({ ativo_id: ativoId, preco_atual: preco_unitario }, { onConflict: "ativo_id" });

  redirect("/bank");
}
