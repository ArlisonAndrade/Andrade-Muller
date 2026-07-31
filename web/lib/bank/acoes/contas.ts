"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function criarConta(formData: FormData) {
  const supabase = await createClient();

  const entidade_id = String(formData.get("entidade_id"));
  const nome = String(formData.get("nome"));
  const tipo = String(formData.get("tipo"));
  const saldo_inicial = Number(formData.get("saldo_inicial") || 0);

  await supabase.from("contas").insert({
    entidade_id,
    nome,
    tipo,
    saldo_inicial,
  });

  redirect("/bank");
}

// Conta com lançamento não é apagada em silêncio: o extrato perderia a
// referência do dinheiro. Recusa explicando o que fazer — apagar a conta
// nunca deveria ser um jeito de sumir com histórico.
export async function excluirConta(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const [{ count: transacoes }, { count: recorrencias }] = await Promise.all([
    supabase.from("transacoes").select("id", { count: "exact", head: true }).eq("conta_id", id),
    supabase.from("recorrencias").select("id", { count: "exact", head: true }).eq("conta_id", id),
  ]);

  if (transacoes) {
    return {
      erro: `Esta conta tem ${transacoes} lançamento(s). Apague-os no Extrato antes, ou deixe a conta como está.`,
    };
  }
  if (recorrencias) {
    return {
      erro: `Esta conta está em ${recorrencias} recorrência(s). Apague-as no Extrato antes.`,
    };
  }

  const { error } = await supabase.from("contas").delete().eq("id", id);
  if (error) return { erro: `Não deu pra excluir a conta: ${error.message}` };

  revalidatePath("/bank/contas");
  revalidatePath("/bank");
}
