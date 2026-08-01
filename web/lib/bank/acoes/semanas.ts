"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Meta em reais da semana. Cadastrada por semana (segunda-feira), mas herdada
// pelas seguintes até alguém mudar — quem edita "a meta" está mudando dali
// pra frente, não só aquela semana.
export async function salvarMetaSemana(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const semana_inicio = String(formData.get("semana_inicio"));
  const meta = Number(formData.get("meta"));

  if (!Number.isFinite(meta) || meta < 0) return { erro: "Meta inválida." };

  const { error } = await supabase
    .from("semanas_orcamento")
    .upsert({ entidade_id, semana_inicio, meta }, { onConflict: "entidade_id,semana_inicio" });
  if (error) return { erro: `Não deu pra salvar a meta: ${error.message}` };

  revalidatePath("/bank/semanas");
  revalidatePath("/bank");
}

// Fatia planejada de uma categoria dentro da meta. Percentual, não valor:
// mudar a meta de R$1.600 pra R$1.400 reajusta todas as fatias sozinho.
export async function salvarFatiaCategoria(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const categoria_id = String(formData.get("categoria_id"));
  const percentual = Number(formData.get("percentual"));

  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    return { erro: "A fatia tem que ficar entre 0 e 100%." };
  }

  // Fatia zerada = categoria sem plano. Some da lista em vez de virar uma
  // linha de "R$ 0 planejados", que não quer dizer nada.
  if (percentual === 0) {
    const { error } = await supabase
      .from("metas_semana_categoria")
      .delete()
      .eq("entidade_id", entidade_id)
      .eq("categoria_id", categoria_id);
    if (error) return { erro: `Não deu pra remover a fatia: ${error.message}` };
  } else {
    const { error } = await supabase.from("metas_semana_categoria").upsert(
      { entidade_id, categoria_id, percentual, updated_at: new Date().toISOString() },
      { onConflict: "entidade_id,categoria_id" },
    );
    if (error) return { erro: `Não deu pra salvar a fatia: ${error.message}` };
  }

  revalidatePath("/bank/semanas");
}
