import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";

// Aporte do mês — regra única, usada pelo plano, pelo score, pela reunião
// trimestral e pelo resumo do Telegram (decisão do Arlison, 01/out/2026):
//   1. aporte INFORMADO (aportes_mensais) vence — quando sai da reserva, o
//      Investidor10 não mostra;
//   2. de out/2026 em diante, a soma das ENTRADAS registradas pela
//      sincronização (movimentos_carteira) — tudo que entrou lá no mês é
//      aporte do mês, e retirada NÃO desconta (set/2026: manobra da reserva);
//   3. antes disso não havia registro por ativo: vale o crescimento líquido do
//      aplicado entre a foto do mês anterior e a do mês.

/** Primeiro mês (AAAAMM) com entradas/retiradas registradas por ativo. */
export const INICIO_MOVIMENTOS = 202610;

export type MovimentosDoMes = { entradas: number; retiradas: number };

const aaaamm = (iso: string) => Number(iso.slice(0, 4)) * 100 + Number(iso.slice(5, 7));
const iso = (m: number) => `${Math.floor(m / 100)}-${String(m % 100).padStart(2, "0")}-01`;

/** Entradas e retiradas por mês (AAAAMM → valores) a partir de um mês. */
export async function movimentosPorMes(supabase: SupabaseClient, desde: number) {
  const { data, error } = await supabase
    .from("movimentos_carteira")
    .select("data, tipo, valor")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .gte("data", iso(desde));
  if (error) throw new Error(`Movimentos da carteira: ${error.message}`);
  const porMes = new Map<number, MovimentosDoMes>();
  for (const m of data ?? []) {
    const mes = aaaamm(String(m.data));
    const atual = porMes.get(mes) ?? { entradas: 0, retiradas: 0 };
    if (m.tipo === "entrada") atual.entradas += Number(m.valor);
    else atual.retiradas += Number(m.valor);
    porMes.set(mes, atual);
  }
  return porMes;
}

export type MovimentoCarteira = {
  id: string;
  data: string;
  ticker: string;
  tipo: "entrada" | "retirada";
  valor: number;
};

/**
 * Os movimentos de um mês, um a um — é o que mostra DE ONDE veio o aporte
 * ("07/10 · XP Horizonte CP · R$ 1.000"), em vez de um total sem história.
 */
export async function movimentosDoMes(
  supabase: SupabaseClient,
  mes: number,
): Promise<MovimentoCarteira[]> {
  const { data, error } = await supabase
    .from("movimentos_carteira")
    .select("id, data, ticker, tipo, valor")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .gte("data", iso(mes))
    .lt("data", iso(mes % 100 === 12 ? mes + 89 : mes + 1))
    .order("data", { ascending: false });
  if (error) throw new Error(`Movimentos da carteira: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: String(m.id),
    data: String(m.data),
    ticker: String(m.ticker),
    tipo: m.tipo as "entrada" | "retirada",
    valor: Number(m.valor),
  }));
}

/**
 * Aporte realizado do mês pela regra acima. `aplicadoMes`/`aplicadoAnterior`
 * só são usados antes de INICIO_MOVIMENTOS.
 */
export function aporteRealizado(opcoes: {
  mes: number;
  informado: number | null | undefined;
  movimentos: MovimentosDoMes | undefined;
  aplicadoMes: number | null | undefined;
  aplicadoAnterior: number | null | undefined;
}): number | null {
  if (opcoes.informado != null) return opcoes.informado;
  if (opcoes.mes >= INICIO_MOVIMENTOS) return Math.round((opcoes.movimentos?.entradas ?? 0) * 100) / 100;
  if (opcoes.aplicadoMes == null || opcoes.aplicadoAnterior == null) return null;
  return opcoes.aplicadoMes - opcoes.aplicadoAnterior;
}
