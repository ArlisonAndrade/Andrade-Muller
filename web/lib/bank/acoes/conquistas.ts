"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";

// A comemoração aparece uma vez por medalha, pra família (quem abrir o site
// primeiro vê; o outro fica sabendo pelo anúncio no grupo do Telegram).
export async function marcarConquistasCelebradas(codigos: string[]) {
  if (codigos.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("conquistas")
    .update({ celebrada_em: new Date().toISOString() })
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .in("codigo", codigos)
    .is("celebrada_em", null);
  if (error) throw new Error(`Falha ao marcar comemoração: ${error.message}`);
  revalidatePath("/bank");
  revalidatePath("/bank/plano");
}
