import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_ARTHUR, ENTIDADE_FAMILIA, type PosicaoAtivo, type Transacao } from "@/lib/bank/tipos";
import { patrimonio } from "@/lib/bank/calculos";
import { classeDe, finalidadeDaClasse } from "@/lib/bank/classes-ativos";
import { projetarArthur } from "@/lib/bank/projecao-arthur";

export type PatrimonioArthur = {
  atual: number;
  posicoes: PosicaoAtivo[];
};

// Patrimônio consolidado do Arthur = a carteira própria dele (ENTIDADE_ARTHUR,
// hoje vazia) + o que está guardado dentro da Família mas é dele por
// finalidade (Fundos + Cripto — ver finalidadeDaClasse). Fonte única pra
// home, /bank/arthur e /bank/investimentos não divergirem sobre o mesmo
// dinheiro.
export async function obterPatrimonioArthur(
  supabase: SupabaseClient,
  cotacoesMap: Map<string, number>,
): Promise<PatrimonioArthur> {
  const [{ data: contas }, { data: transacoes }, { data: posicoesArthur }, { data: posicoesFamilia }] =
    await Promise.all([
      supabase.from("contas").select("id, saldo_inicial").eq("entidade_id", ENTIDADE_ARTHUR),
      supabase
        .from("transacoes")
        .select("valor, categoria:categorias(tipo)")
        .eq("entidade_id", ENTIDADE_ARTHUR),
      supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_ARTHUR),
      supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_FAMILIA),
    ]);

  const posicoesArthurNaFamilia = ((posicoesFamilia ?? []) as PosicaoAtivo[]).filter(
    (p) => finalidadeDaClasse(classeDe(p.tipo)) === "arthur",
  );
  const posicoes = [...((posicoesArthur ?? []) as PosicaoAtivo[]), ...posicoesArthurNaFamilia];

  const atual = patrimonio(
    contas ?? [],
    (transacoes ?? []) as unknown as Transacao[],
    posicoes,
    cotacoesMap,
  );

  return { atual, posicoes };
}

// Meta em R$ da carteira do Arthur = o valor final da projeção salva em
// /bank/arthur (aporte mensal + aniversário + rentabilidade até a idade
// alvo) — decisão do Arlison em 13/ago/2026 pra não duplicar a meta como um
// número digitado à parte: ela já "vive" no simulador, mexer nos sliders lá
// muda a meta aqui também.
export async function obterMetaArthur(
  supabase: SupabaseClient,
  patrimonioAtual: number,
): Promise<number> {
  const { data: parametros } = await supabase
    .from("parametros_plano")
    .select("chave, valor")
    .eq("entidade_id", ENTIDADE_ARTHUR);
  const params = new Map((parametros ?? []).map((p) => [p.chave, Number(p.valor)]));
  const aporteMensal = params.get("arthur_aporte_mensal") ?? 100;
  const aporteAniversario = params.get("arthur_aporte_aniversario") ?? 500;
  const rentabilidade = params.get("arthur_rentabilidade_aa") ?? 10;
  const idadeAlvo = params.get("arthur_idade_alvo") ?? 18;
  const crescimentoAporte = params.get("arthur_crescimento_aporte_aa") ?? 10;

  const projecao = projetarArthur(
    patrimonioAtual,
    aporteMensal,
    aporteAniversario,
    rentabilidade,
    idadeAlvo,
    crescimentoAporte,
  );
  return projecao[projecao.length - 1]?.valor ?? patrimonioAtual;
}
