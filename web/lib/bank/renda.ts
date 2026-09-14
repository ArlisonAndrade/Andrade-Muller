import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA, tipoRendaDaPessoa, type Pessoa } from "@/lib/bank/tipos";

// A renda do mês da família, em UM lugar só.
//
// Existiam duas definições concorrentes: a que o Arlison edita em Planejamento
// (`renda_mensal`, ajustável mês a mês) e a soma das transações de receita
// lançadas. A primeira alimentava só a própria tela; a segunda alimentava o
// Orçamento 50/30/20 da home e o pilar de orçamento do score. Resultado: ele
// ajustava o salário do mês e nada recalculava.
//
// A régua agora é sempre a planejada (decisão do Arlison, 07/set/2026) — é o
// número que ele controla e revisa. O que caiu de verdade em transações entra
// como conferência, não como base de cálculo. Mesmo princípio do painel semanal
// e do bot: uma leitura, várias telas, sem divergir sobre o mesmo dinheiro.
//
// O cálculo segue o que foi SALVO em Planejamento (decisão do Arlison,
// 14/set/2026). Mês que ainda não foi salvo repete o último mês salvo — não a
// renda_base, que ninguém mantém — e a tela pede pra confirmar ou editar.

export type RendaDoMes = {
  valor: number;
  confirmado: boolean;
  /** true = salvo neste mês; false = repetido do último mês salvo (ou renda_base). */
  temLancamento: boolean;
};

export type RendaFamiliaMes = {
  competencia: string;
  pessoas: Pessoa[];
  porPessoa: Map<string, RendaDoMes>;
  total: number;
  /** Algum salário deste mês ainda não foi salvo. */
  pendente: boolean;
  /** Mês salvo mais recente de onde os valores pendentes vieram (null = renda_base). */
  herdadoDe: string | null;
};

export function competenciaDe(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function montarRendaDoMes(
  supabase: SupabaseClient,
  competencia: string,
  entidadeId: string = ENTIDADE_FAMILIA,
): Promise<RendaFamiliaMes> {
  const [{ data: pessoasRaw }, { data: rendaRaw }] = await Promise.all([
    supabase
      .from("pessoas")
      .select("id, entidade_id, nome, cor, renda_base, ordem, ativo")
      .eq("entidade_id", entidadeId)
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("renda_mensal")
      .select("competencia, tipo, valor, confirmado")
      .eq("entidade_id", entidadeId)
      .lte("competencia", competencia)
      .order("competencia", { ascending: false }),
  ]);

  const pessoas = (pessoasRaw ?? []) as Pessoa[];

  // Primeira linha de cada tipo = a mais recente até este mês.
  const ultimaPorTipo = new Map<
    string,
    { competencia: string; valor: number; confirmado: boolean }
  >();
  for (const r of rendaRaw ?? []) {
    if (ultimaPorTipo.has(r.tipo)) continue;
    ultimaPorTipo.set(r.tipo, {
      competencia: String(r.competencia).slice(0, 10),
      valor: Number(r.valor),
      confirmado: r.confirmado ?? false,
    });
  }

  let herdadoDe: string | null = null;
  const porPessoa = new Map<string, RendaDoMes>(
    pessoas.map((p) => {
      const ultima = ultimaPorTipo.get(tipoRendaDaPessoa(p.nome));
      if (ultima && ultima.competencia === competencia) {
        return [p.id, { valor: ultima.valor, confirmado: ultima.confirmado, temLancamento: true }];
      }
      if (ultima && (herdadoDe == null || ultima.competencia > herdadoDe)) {
        herdadoDe = ultima.competencia;
      }
      return [
        p.id,
        {
          valor: ultima ? ultima.valor : Number(p.renda_base),
          confirmado: false,
          temLancamento: false,
        },
      ];
    }),
  );

  const total = pessoas.reduce((s, p) => s + (porPessoa.get(p.id)?.valor ?? 0), 0);
  const pendente = pessoas.some((p) => !porPessoa.get(p.id)?.temLancamento);
  return { competencia, pessoas, porPessoa, total, pendente, herdadoDe };
}
