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

export type RendaDoMes = {
  valor: number;
  confirmado: boolean;
  temLancamento: boolean; // false = ainda é o fallback da renda_base
};

export type RendaFamiliaMes = {
  competencia: string;
  pessoas: Pessoa[];
  porPessoa: Map<string, RendaDoMes>;
  total: number;
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
      .select("tipo, valor, confirmado")
      .eq("entidade_id", entidadeId)
      .eq("competencia", competencia),
  ]);

  const pessoas = (pessoasRaw ?? []) as Pessoa[];
  const porTipo = new Map(
    (rendaRaw ?? []).map((r) => [
      r.tipo,
      { valor: Number(r.valor), confirmado: r.confirmado ?? false },
    ]),
  );

  // Mês sem edição herda a renda_base da pessoa: assim a home nunca nasce
  // zerada num dia 1º só porque ninguém abriu o Planejamento ainda.
  const porPessoa = new Map<string, RendaDoMes>(
    pessoas.map((p) => {
      const lancado = porTipo.get(tipoRendaDaPessoa(p.nome));
      return [
        p.id,
        lancado
          ? { valor: lancado.valor, confirmado: lancado.confirmado, temLancamento: true }
          : { valor: Number(p.renda_base), confirmado: false, temLancamento: false },
      ];
    }),
  );

  const total = pessoas.reduce((s, p) => s + (porPessoa.get(p.id)?.valor ?? 0), 0);
  return { competencia, pessoas, porPessoa, total };
}
