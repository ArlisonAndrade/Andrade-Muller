import type { SupabaseClient } from "@supabase/supabase-js";
import { temCotacaoAutomatica } from "@/lib/bank/classes-ativos";

// Atualiza cotações de ações/FIIs B3 via brapi.dev (grátis; BRAPI_TOKEN
// opcional aumenta o rate limit). Compartilhada entre o botão manual
// (sessão do usuário — RLS permite upsert em cotacoes_atuais) e a rota de
// cron (service-role). Renda fixa/tesouro/fundos/cripto ficam no manual.
export async function atualizarCotacoesB3(supabase: SupabaseClient) {
  const { data: ativos } = await supabase.from("ativos").select("id, ticker, tipo");
  const automaticos = (ativos ?? []).filter((a) => temCotacaoAutomatica(a.tipo));
  if (automaticos.length === 0) {
    return { atualizados: 0, falhas: [] as string[] };
  }

  const token = process.env.BRAPI_TOKEN;
  const tickers = automaticos.map((a) => a.ticker).join(",");
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(tickers)}${
    token ? `?token=${token}` : ""
  }`;

  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) {
    return { atualizados: 0, falhas: automaticos.map((a) => a.ticker) };
  }
  const corpo = (await resposta.json()) as {
    results?: Array<{
      symbol: string;
      regularMarketPrice?: number;
      regularMarketChangePercent?: number;
    }>;
  };

  const porTicker = new Map((corpo.results ?? []).map((r) => [r.symbol.toUpperCase(), r]));
  let atualizados = 0;
  const falhas: string[] = [];

  for (const ativo of automaticos) {
    const cotacao = porTicker.get(ativo.ticker.toUpperCase());
    if (!cotacao?.regularMarketPrice) {
      falhas.push(ativo.ticker);
      continue;
    }
    const { error } = await supabase.from("cotacoes_atuais").upsert(
      {
        ativo_id: ativo.id,
        preco_atual: cotacao.regularMarketPrice,
        variacao_dia_pct: cotacao.regularMarketChangePercent ?? null,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "ativo_id" },
    );
    if (error) falhas.push(ativo.ticker);
    else atualizados++;
  }

  return { atualizados, falhas };
}
