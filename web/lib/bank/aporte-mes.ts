import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { aporteDoMesPlanejado, mesAtual } from "@/lib/bank/plano";
import {
  aporteRealizado,
  movimentosDoMes,
  movimentosPorMes,
  type MovimentoCarteira,
} from "@/lib/bank/aporte";

export type AporteDoMes = {
  mes: number;
  movimentos: MovimentoCarteira[];
  realizado: number;
  planejado: number;
  informado: boolean;
};

/**
 * O aporte do mês corrente com os movimentos que o compõem — o que alimenta o
 * bloco "Aportes do mês" na página de investimentos e no plano, e o anúncio no
 * grupo. Vive num arquivo próprio porque junta as duas pontas (`aporte.ts`, a
 * regra; `plano.ts`, o alvo) e `plano.ts` já depende de `aporte.ts`.
 */
export async function aporteDoMesCorrente(supabase: SupabaseClient): Promise<AporteDoMes> {
  const mes = mesAtual();
  const inicioMes = `${Math.floor(mes / 100)}-${String(mes % 100).padStart(2, "0")}-01`;

  const [movimentos, planejado, { data: informadoRow }, porMes] = await Promise.all([
    movimentosDoMes(supabase, mes),
    aporteDoMesPlanejado(supabase),
    supabase
      .from("aportes_mensais")
      .select("valor")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("mes", inicioMes)
      .maybeSingle(),
    movimentosPorMes(supabase, mes),
  ]);

  const informado = informadoRow != null ? Number(informadoRow.valor) : null;
  const realizado = Math.max(
    0,
    aporteRealizado({
      mes,
      informado,
      movimentos: porMes.get(mes),
      aplicadoMes: null,
      aplicadoAnterior: null,
    }) ?? 0,
  );

  return { mes, movimentos, realizado, planejado, informado: informado != null };
}
