import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { rotuloMes } from "@/lib/bank/plano";
import { aporteDoMesCorrente } from "@/lib/bank/aporte-mes";

// Aporte novo é anunciado no grupo, uma vez só (migration 28) — mesmo
// princípio das medalhas: é fato, não opinião do modelo, então sai mesmo
// quando o resumo decidiu calar. Fecha o ciclo do aporte: ele compra no
// Investidor10, a sincronização percebe, e o Arkad confirma no mesmo dia em
// vez de o número aparecer calado no placar do plano.
//
// Retirada não vira anúncio (e desde 07/out/2026 não acontece mais: "agora é
// repor com juros o que me peguei emprestado").

const reais = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const curto = (ticker: string) => (ticker.length > 38 ? `${ticker.slice(0, 37)}…` : ticker);

export async function anunciarAportesNovos(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from("movimentos_carteira")
    .select("id, data, ticker, valor")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("tipo", "entrada")
    .is("anunciado_em", null)
    .order("data");
  if (error) throw new Error(`Aportes a anunciar: ${error.message}`);
  const novos = data ?? [];
  if (novos.length === 0) return "";

  const { mes, realizado, planejado } = await aporteDoMesCorrente(supabase);
  const mesCorrente = `${Math.floor(mes / 100)}-${String(mes % 100).padStart(2, "0")}`;
  const todosDesteMes = novos.every((m) => String(m.data).startsWith(mesCorrente));

  await supabase
    .from("movimentos_carteira")
    .update({ anunciado_em: new Date().toISOString() })
    .in("id", novos.map((m) => m.id));

  const linhas = novos.map((m) => `• ${diaMes(String(m.data))} · ${curto(String(m.ticker))} — ${reais(Number(m.valor))}`);
  const blocos = [`💰 Família, entrou dinheiro novo na carteira:\n${linhas.join("\n")}`];

  // A régua só vale se tudo que está sendo anunciado é do mês corrente —
  // senão o total do mês não explica a lista.
  if (todosDesteMes) {
    const falta = planejado - realizado;
    blocos.push(
      falta <= 1
        ? `Aporte de ${rotuloMes(mes)}: ${reais(realizado)} de ${reais(planejado)}. Mês cumprido. 🎯`
        : `Aporte de ${rotuloMes(mes)}: ${reais(realizado)} de ${reais(planejado)} — faltam ${reais(falta)}.`,
    );
  }
  return blocos.join("\n\n");
}
