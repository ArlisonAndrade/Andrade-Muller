"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { projetarPatrimonio } from "@/lib/bank/projecao";

// Salva parâmetros de simulador (chave/valor) da entidade.
// Campos do form: entidade_id, caminho (path pra revalidar) e pares
// param_<chave>=<valor numérico>.
export async function salvarParametrosPlano(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const caminho = String(formData.get("caminho") || "/bank/plano");

  const linhas: Array<{ entidade_id: string; chave: string; valor: number }> = [];
  for (const [nome, bruto] of formData.entries()) {
    if (!nome.startsWith("param_")) continue;
    const valor = Number(bruto);
    if (!Number.isFinite(valor)) continue;
    linhas.push({ entidade_id, chave: nome.slice("param_".length), valor });
  }
  if (linhas.length > 0) {
    const { error } = await supabase
      .from("parametros_plano")
      .upsert(linhas, { onConflict: "entidade_id,chave" });
    if (error) throw new Error(`Falha ao salvar parâmetros: ${error.message}`);
  }
  revalidatePath(caminho);
}

// Salva o simulador do Plano E regenera a curva-alvo (plano_patrimonio) de
// agora até 2049 com os novos parâmetros — antes, "Salvar esses parâmetros"
// só gravava em parametros_plano, mas "Alvo do plano"/"Você está X%" e o
// pilar Aporte do score de saúde liam plano_patrimonio, que continuava
// preso na curva original de 2025. Sem isso o botão parecia salvar mas o
// plano de verdade nunca mudava. Anos já passados ficam intocados (são
// histórico); daqui pra frente a curva é a nova simulação.
export async function salvarPlanoCompleto(formData: FormData) {
  const supabase = await createClient();
  const entidade_id = String(formData.get("entidade_id"));
  const aporteMensal = Number(formData.get("aporte_mensal"));
  const rentabilidade = Number(formData.get("rentabilidade"));
  const crescimentoAporte = Number(formData.get("crescimento_aporte"));
  const patrimonioAtual = Number(formData.get("patrimonio_atual"));
  const anoAtual = new Date().getFullYear();

  const { error: erroParams } = await supabase.from("parametros_plano").upsert(
    [
      { entidade_id, chave: "plano6m_aporte_mensal", valor: aporteMensal },
      { entidade_id, chave: "plano6m_rentabilidade_aa", valor: rentabilidade },
      { entidade_id, chave: "plano6m_crescimento_aporte_aa", valor: crescimentoAporte },
    ],
    { onConflict: "entidade_id,chave" },
  );
  if (erroParams) throw new Error(`Falha ao salvar parâmetros: ${erroParams.message}`);

  const projecao = projetarPatrimonio(
    patrimonioAtual,
    aporteMensal,
    rentabilidade,
    anoAtual,
    2049,
    crescimentoAporte,
  );
  let aporteDoAno = aporteMensal;
  const curva = projecao.map((p) => {
    const linha = { entidade_id, ano: p.ano, aporte_planejado: Math.round(aporteDoAno * 12), valor_alvo: p.valor };
    aporteDoAno *= 1 + crescimentoAporte / 100;
    return linha;
  });
  const { error: erroCurva } = await supabase
    .from("plano_patrimonio")
    .upsert(curva, { onConflict: "entidade_id,ano" });
  if (erroCurva) throw new Error(`Falha ao atualizar a curva do plano: ${erroCurva.message}`);

  revalidatePath("/bank/plano");
  revalidatePath("/bank");
}
