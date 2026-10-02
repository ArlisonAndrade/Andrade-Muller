import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { montarRendaDoMes } from "@/lib/bank/renda";
import { metaSemanalDoMes } from "@/lib/bank/meta-semanal-mes";

// A divisão dos pagamentos do mês, pessoa a pessoa — a mesma conta dos cards
// de /bank/norte (components/bank/norte/cards-responsavel.tsx), pra o Modo TV
// mostrar o mesmo número que o Planejamento:
//   paga direto = despesas dela sem transferência
//   transfere   = despesas dela pagas transferindo pro outro
//   sobra livre = renda − paga direto − transfere
// A transferência RECEBIDA não entra na sobra: ela só passa pela conta pra
// pagar as contas do outro que estão no cartão de quem recebe (Arlison,
// 02/out/2026). "Gastos Variáveis Semanais" vale a soma das metas do mês.

export type DivisaoPessoa = {
  id: string;
  nome: string;
  cor: string | null;
  renda: number;
  direto: number;
  transfere: number;
  sobra: number;
  /** % da renda que sai (direto + transfere). */
  pctComprometido: number;
};

export type DivisaoDoMes = {
  competencia: string;
  pessoas: DivisaoPessoa[];
  rendaTotal: number;
  sobraTotal: number;
};

export async function montarDivisaoDoMes(supabase: SupabaseClient, competencia: string): Promise<DivisaoDoMes> {
  const [{ data: itens, error }, renda, metaMes] = await Promise.all([
    supabase
      .from("orcamento_planejado")
      .select("valor, responsavel_id, transferencia, vinculo")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ativo", true),
    montarRendaDoMes(supabase, competencia),
    metaSemanalDoMes(supabase, ENTIDADE_FAMILIA, competencia),
  ]);
  if (error) throw new Error(`Planejamento: ${error.message}`);

  const valor = (i: { valor: number | string; vinculo: string | null }) =>
    i.vinculo === "meta_semanal" ? metaMes.total : Number(i.valor);

  const pessoas = renda.pessoas.map((p) => {
    const dela = (itens ?? []).filter((i) => i.responsavel_id === p.id);
    const direto = dela.filter((i) => !i.transferencia).reduce((s, i) => s + valor(i), 0);
    const transfere = dela.filter((i) => i.transferencia).reduce((s, i) => s + valor(i), 0);
    const r = renda.porPessoa.get(p.id)?.valor ?? Number(p.renda_base);
    return {
      id: p.id,
      nome: p.nome,
      cor: p.cor ?? null,
      renda: r,
      direto,
      transfere,
      sobra: r - direto - transfere,
      pctComprometido: r > 0 ? ((direto + transfere) / r) * 100 : 0,
    };
  });

  return {
    competencia,
    pessoas,
    rendaTotal: pessoas.reduce((s, p) => s + p.renda, 0),
    sobraTotal: pessoas.reduce((s, p) => s + p.sobra, 0),
  };
}
