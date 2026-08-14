import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_ARTHUR, ENTIDADE_FAMILIA, type PosicaoAtivo, type Transacao } from "@/lib/bank/tipos";
import { patrimonio } from "@/lib/bank/calculos";
import { classeDe, finalidadeDaClasse } from "@/lib/bank/classes-ativos";
import { META_FINAL_ARTHUR } from "@/lib/bank/plano-arthur";

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

// Meta em R$ da carteira do Arthur = o valor final do plano fixo em fases
// (ver lib/bank/plano-arthur.ts) — decisão do Arlison em 13/ago/2026,
// substituindo o simulador de sliders por fases fechadas com aporte
// definido. Não depende mais de parâmetros salvos por página.
export function obterMetaArthur(): number {
  return META_FINAL_ARTHUR;
}
