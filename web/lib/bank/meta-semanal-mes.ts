import type { SupabaseClient } from "@supabase/supabase-js";
import { segundaDaSemana, somarDias } from "@/lib/bank/agente/datas";

// Quanto a meta semanal soma num mês — o valor da despesa "Gastos Variáveis
// Semanais" do Planejamento (migration 24). Mesma regra de /bank/semanas: a
// semana pertence ao mês da segunda-feira em que começa, e a meta vale da
// semana em que foi editada em diante (herança).
export async function metaSemanalDoMes(
  supabase: SupabaseClient,
  entidadeId: string,
  competencia: string, // AAAA-MM-01
): Promise<{ semanas: Array<{ inicio: string; meta: number }>; total: number; metaAtual: number | null }> {
  const mes = competencia.slice(0, 7);
  const inicios: string[] = [];
  let segunda = segundaDaSemana(`${mes}-01`);
  if (segunda.slice(0, 7) !== mes) segunda = somarDias(segunda, 7);
  while (segunda.slice(0, 7) === mes) {
    inicios.push(segunda);
    segunda = somarDias(segunda, 7);
  }

  const { data } = await supabase
    .from("semanas_orcamento")
    .select("semana_inicio, meta")
    .eq("entidade_id", entidadeId)
    .lte("semana_inicio", inicios[inicios.length - 1] ?? `${mes}-31`)
    .order("semana_inicio", { ascending: false });

  const metas = (data ?? []).map((m) => ({ inicio: String(m.semana_inicio), meta: Number(m.meta) }));
  const metaDe = (inicio: string) => metas.find((m) => m.inicio <= inicio)?.meta ?? 0;
  const semanas = inicios.map((inicio) => ({ inicio, meta: metaDe(inicio) }));
  return {
    semanas,
    total: semanas.reduce((s, w) => s + w.meta, 0),
    metaAtual: semanas.length ? semanas[semanas.length - 1].meta : null,
  };
}
