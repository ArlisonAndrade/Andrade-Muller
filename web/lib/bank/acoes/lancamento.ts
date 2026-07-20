"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarLancamento(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const conta_id = String(formData.get("conta_id") || "") || null;
  const categoria_id = String(formData.get("categoria_id") || "") || null;
  // No lançamento rápido a descrição é opcional — cai no nome da categoria.
  const descricao =
    String(formData.get("descricao") || "").trim() ||
    String(formData.get("descricao_padrao") || "").trim() ||
    "Lançamento";
  const valor = Number(formData.get("valor"));
  const data = String(formData.get("data"));
  const forma_pagamento = String(formData.get("forma_pagamento") || "") || null;
  // cartao_id só faz sentido no crédito — ignora resíduo de outras formas.
  const cartao_id =
    forma_pagamento === "credito"
      ? String(formData.get("cartao_id") || "") || null
      : null;

  const { error } = await supabase.from("transacoes").insert({
    entidade_id,
    conta_id,
    categoria_id,
    descricao,
    valor,
    data,
    forma_pagamento,
    cartao_id,
  });
  if (error) throw new Error(`Falha ao lançar: ${error.message}`);

  // "Salvar e lançar outro" volta pro form limpo com confirmação.
  if (String(formData.get("acao")) === "salvar_outro") {
    redirect("/bank/lancar?salvo=1");
  }
  redirect("/bank/lancamentos");
}
