import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { hojeSP } from "@/lib/bank/agente/datas";
import { avaliarConquistas } from "@/lib/bank/conquistas";

// Sincronização da carteira com o Investidor10 (decisão do Arlison, 14/set/2026).
//
// O Arlison registra compra e venda no Investidor10 — é lá que a carteira é
// mantida. O link público da carteira expõe a API interna que a própria página
// consome, sem login: por classe, cada ativo com quantidade, preço médio e
// valor em reais (renda fixa já com o CDI, ETF já convertido do dólar).
//
// Modelo: cada ativo tem UMA movimentação `origem = 'investidor10'` (criada na
// carga de 02/ago/2026), e ela vira espelho da posição de lá — quantidade e
// custo total. A cotação vira `valor em reais ÷ quantidade`. Assim a view
// `posicao_ativos` e todas as telas que já leem dela continuam iguais.
//
// Regra que sustenta tudo: se a resposta vier incompleta ou os totais não
// baterem com o resumo da carteira, NADA é gravado. Valor velho marcado como
// atual é pior que valor velho com aviso — foi assim que a carteira ficou
// congelada 6 semanas sem ninguém perceber.

const BASE = "https://investidor10.com.br/wallet/api/proxy/wallet-app";

const TIPO_POR_CLASSE: Record<string, string> = {
  Ticker: "acao",
  Fii: "fii",
  FixedIncome: "renda_fixa",
  Crypto: "cripto",
  EtfInternational: "etf_internacional",
  Fund: "fundo",
  Treasure: "tesouro",
};

/** Tolerância entre a soma dos ativos e o resumo da carteira (câmbio, arredondamento). */
const TOLERANCIA = 0.01;

export type AlteracaoSync = {
  ticker: string;
  campo: "quantidade" | "aplicado" | "novo" | "zerado";
  antes: number | null;
  depois: number | null;
};

export type ResultadoSync = {
  ok: boolean;
  erro: string | null;
  aplicado: number | null;
  patrimonio: number | null;
  ativos: number;
  alteracoes: AlteracaoSync[];
};

type PosicaoI10 = {
  ref: string;
  classe: string;
  ticker: string;
  quantidade: number;
  aplicado: number; // custo total em R$
  valor: number; // valor de mercado em R$
};

type ItemBruto = Record<string, unknown>;

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

async function buscarJson<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE}/${caminho}`, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (AndradeMullerBank)", Accept: "application/json" },
  });
  if (!resposta.ok) {
    throw new Error(`Investidor10 respondeu ${resposta.status} em ${caminho.split("?")[0]}`);
  }
  return (await resposta.json()) as T;
}

/** Custo total em R$ de um item, conforme o formato de cada classe. */
function aplicadoDe(classe: string, item: ItemBruto, quantidade: number, valor: number): number {
  if (classe === "FixedIncome") return num(item.applied);
  if (classe === "Treasure") return quantidade * num(item.avg_price_treasure);
  const precoMedio = num(item.avg_price);
  if (classe === "EtfInternational") {
    // preço médio vem em dólar; converte pelo câmbio implícito de hoje
    // (valor em R$ ÷ valor em US$). Diferença contra o resumo: ~R$ 10.
    const cambio = valor / (quantidade * num(item.current_price));
    return quantidade * precoMedio * cambio;
  }
  return quantidade * precoMedio;
}

/** Lê a carteira inteira e confere contra o resumo. Lança erro se algo não bater. */
export async function lerCarteiraInvestidor10(walletId: number) {
  const [metricas, classes] = await Promise.all([
    buscarJson<{ applied?: string; equity?: string }>(
      `summary/metrics/${walletId}?type=without-earnings&raw=1`,
    ),
    buscarJson<Array<{ type: string; value: number }>>(
      `summary/donutchart/${walletId}/all?groupBy=type`,
    ),
  ]);

  const patrimonioResumo = num(metricas.equity);
  const aplicadoResumo = num(metricas.applied);
  if (!Number.isFinite(patrimonioResumo) || !Array.isArray(classes) || classes.length === 0) {
    throw new Error("Resposta do Investidor10 em formato inesperado (resumo da carteira).");
  }

  const posicoes: PosicaoI10[] = [];
  for (const { type: classe, value: valorClasse } of classes) {
    const lista = await buscarJson<{ total?: number; data?: ItemBruto[] }>(
      `summary/actives/${walletId}/${encodeURIComponent(classe)}?raw=1&selected_wallet_currency=BRL&api_version=v2`,
    );
    const itens = lista.data ?? [];
    if (lista.total != null && lista.total !== itens.length) {
      throw new Error(`Investidor10 devolveu a classe ${classe} incompleta (${itens.length} de ${lista.total}).`);
    }

    let somaClasse = 0;
    for (const item of itens) {
      const quantidade = num(item.quantity);
      const valor = num(item.equity_brl);
      const aplicado = aplicadoDe(classe, item, quantidade, valor);
      const ticker = String(item.ticker ?? item.name ?? "").trim();
      if (!ticker || !Number.isFinite(quantidade) || !Number.isFinite(valor) || !Number.isFinite(aplicado)) {
        throw new Error(`Ativo em formato inesperado na classe ${classe} (id ${String(item.id)}).`);
      }
      somaClasse += valor;
      posicoes.push({ ref: `i10:${classe}:${String(item.id)}`, classe, ticker, quantidade, aplicado, valor });
    }

    if (Math.abs(somaClasse - Number(valorClasse)) > Math.max(1, Number(valorClasse) * TOLERANCIA)) {
      throw new Error(`Classe ${classe} não fecha: soma dos ativos R$ ${somaClasse.toFixed(2)} contra R$ ${Number(valorClasse).toFixed(2)} do resumo.`);
    }
  }

  const somaValor = posicoes.reduce((s, p) => s + p.valor, 0);
  const somaAplicado = posicoes.reduce((s, p) => s + p.aplicado, 0);
  if (Math.abs(somaValor - patrimonioResumo) > Math.max(1, patrimonioResumo * TOLERANCIA)) {
    throw new Error(`Carteira não fecha: soma R$ ${somaValor.toFixed(2)} contra R$ ${patrimonioResumo.toFixed(2)} do resumo.`);
  }
  if (Number.isFinite(aplicadoResumo) && Math.abs(somaAplicado - aplicadoResumo) > Math.max(1, aplicadoResumo * TOLERANCIA)) {
    throw new Error(`Aplicado não fecha: soma R$ ${somaAplicado.toFixed(2)} contra R$ ${aplicadoResumo.toFixed(2)} do resumo.`);
  }

  return {
    posicoes,
    patrimonio: patrimonioResumo,
    aplicado: Number.isFinite(aplicadoResumo) ? aplicadoResumo : somaAplicado,
  };
}

const quase = (a: number, b: number, tolerancia: number) => Math.abs(a - b) <= tolerancia;

/**
 * Lê o Investidor10 e espelha no banco. Funciona com o client da sessão
 * (botão) e com o service-role (cron). Sempre grava uma linha de log —
 * inclusive quando falha, que é o ponto.
 */
export async function sincronizarInvestidor10(
  supabase: SupabaseClient,
  origem: "manual" | "cron" = "manual",
  entidadeId: string = ENTIDADE_FAMILIA,
): Promise<ResultadoSync> {
  const registrar = async (r: ResultadoSync) => {
    await supabase.from("sincronizacoes_investidor10").insert({
      entidade_id: entidadeId,
      ok: r.ok,
      erro: r.erro,
      aplicado: r.aplicado,
      patrimonio: r.patrimonio,
      ativos: r.ativos,
      alteracoes: r.alteracoes,
      origem,
    });
    return r;
  };
  const falha = (erro: string) =>
    registrar({ ok: false, erro, aplicado: null, patrimonio: null, ativos: 0, alteracoes: [] });

  const { data: parametro, error: erroParametro } = await supabase
    .from("parametros_plano")
    .select("valor")
    .eq("entidade_id", entidadeId)
    .eq("chave", "investidor10_wallet_id")
    .maybeSingle();
  if (erroParametro) return falha(`Banco: ${erroParametro.message}`);
  const walletId = Number(parametro?.valor);
  if (!walletId) return falha("Carteira do Investidor10 não configurada (parametros_plano.investidor10_wallet_id).");

  let carteira: Awaited<ReturnType<typeof lerCarteiraInvestidor10>>;
  try {
    carteira = await lerCarteiraInvestidor10(walletId);
  } catch (e) {
    return falha(e instanceof Error ? e.message : "Falha ao ler o Investidor10.");
  }

  // Estado atual no banco: ativos ligados ao Investidor10 e a movimentação espelho de cada um.
  const [{ data: ativos, error: erroAtivos }, { data: movimentos, error: erroMov }] = await Promise.all([
    supabase.from("ativos").select("id, ticker, tipo, origem_ref"),
    supabase
      .from("movimentacoes_ativos")
      .select("id, ativo_id, quantidade, preco_unitario, origem, tipo")
      .eq("entidade_id", entidadeId),
  ]);
  if (erroAtivos || erroMov) return falha(`Banco: ${(erroAtivos ?? erroMov)!.message}`);

  const ativoPorRef = new Map((ativos ?? []).filter((a) => a.origem_ref).map((a) => [a.origem_ref as string, a]));
  const ativoPorTicker = new Map((ativos ?? []).map((a) => [a.ticker.toUpperCase(), a]));
  const movsPorAtivo = new Map<string, NonNullable<typeof movimentos>>();
  for (const m of movimentos ?? []) {
    movsPorAtivo.set(m.ativo_id, [...(movsPorAtivo.get(m.ativo_id) ?? []), m]);
  }

  const alteracoes: AlteracaoSync[] = [];
  const agora = new Date().toISOString();
  const hoje = hojeSP();

  try {
    for (const p of carteira.posicoes) {
      // 1. o ativo
      let ativo = ativoPorRef.get(p.ref) ?? ativoPorTicker.get(p.ticker.toUpperCase());
      if (!ativo) {
        const { data: novo, error } = await supabase
          .from("ativos")
          .insert({
            ticker: p.ticker,
            tipo: TIPO_POR_CLASSE[p.classe] ?? "outro",
            nome: p.ticker,
            origem: "investidor10",
            origem_ref: p.ref,
          })
          .select("id, ticker, tipo, origem_ref")
          .single();
        if (error) throw new Error(`Criar ativo ${p.ticker}: ${error.message}`);
        ativo = novo;
        alteracoes.push({ ticker: p.ticker, campo: "novo", antes: null, depois: p.quantidade });
      } else if (ativo.origem_ref !== p.ref) {
        await supabase.from("ativos").update({ origem: "investidor10", origem_ref: p.ref }).eq("id", ativo.id);
      }

      // 2. a posição (movimentação espelho)
      const movs = movsPorAtivo.get(ativo.id) ?? [];
      const manuais = movs.filter((m) => m.origem !== "investidor10");
      if (manuais.length > 0) {
        // Lançamento feito à mão aqui somaria em cima do espelho e dobraria a posição.
        throw new Error(`${p.ticker} tem movimentação lançada à mão no Bank — resolva antes de sincronizar.`);
      }
      const espelho = movs.find((m) => m.origem === "investidor10");
      const precoMedio = p.quantidade > 0 ? p.aplicado / p.quantidade : 0;

      if (!espelho) {
        const { error } = await supabase.from("movimentacoes_ativos").insert({
          entidade_id: entidadeId,
          ativo_id: ativo.id,
          tipo: "compra",
          quantidade: p.quantidade,
          preco_unitario: precoMedio,
          data: hoje,
          origem: "investidor10",
          origem_ref: p.ref,
        });
        if (error) throw new Error(`Posição de ${p.ticker}: ${error.message}`);
      } else {
        const qtdAntes = Number(espelho.quantidade);
        const aplicadoAntes = qtdAntes * Number(espelho.preco_unitario);
        const mudouQtd = !quase(qtdAntes, p.quantidade, 1e-6);
        const mudouAplicado = !quase(aplicadoAntes, p.aplicado, 0.5);
        if (mudouQtd || mudouAplicado || espelho.tipo !== "compra") {
          const { error } = await supabase
            .from("movimentacoes_ativos")
            .update({ tipo: "compra", quantidade: p.quantidade, preco_unitario: precoMedio })
            .eq("id", espelho.id);
          if (error) throw new Error(`Posição de ${p.ticker}: ${error.message}`);
          if (mudouQtd) alteracoes.push({ ticker: p.ticker, campo: "quantidade", antes: qtdAntes, depois: p.quantidade });
          else alteracoes.push({ ticker: p.ticker, campo: "aplicado", antes: round2(aplicadoAntes), depois: round2(p.aplicado) });
        }
      }

      // 3. a cotação, em reais
      const { error: erroCotacao } = await supabase.from("cotacoes_atuais").upsert(
        {
          ativo_id: ativo.id,
          preco_atual: p.quantidade > 0 ? p.valor / p.quantidade : 0,
          variacao_dia_pct: null,
          atualizado_em: agora,
        },
        { onConflict: "ativo_id" },
      );
      if (erroCotacao) throw new Error(`Cotação de ${p.ticker}: ${erroCotacao.message}`);
    }

    // 4. vendido por inteiro lá → some daqui (sem apagar o ativo, que pode ter histórico de provento)
    const refsNaCarteira = new Set(carteira.posicoes.map((p) => p.ref));
    for (const a of ativos ?? []) {
      if (!a.origem_ref?.startsWith("i10:") || refsNaCarteira.has(a.origem_ref)) continue;
      const espelho = (movsPorAtivo.get(a.id) ?? []).find((m) => m.origem === "investidor10");
      if (!espelho) continue;
      await supabase.from("movimentacoes_ativos").delete().eq("id", espelho.id);
      alteracoes.push({ ticker: a.ticker, campo: "zerado", antes: Number(espelho.quantidade), depois: 0 });
    }

    // 5. foto do mês com os números novos — é dela que sai o aporte do mês
    await supabase.from("snapshots_patrimonio").upsert(
      {
        entidade_id: entidadeId,
        competencia: `${hoje.slice(0, 7)}-01`,
        valor_aplicado: round2(carteira.aplicado),
        valor_mercado: round2(carteira.patrimonio),
        saldo_contas: 0,
      },
      { onConflict: "entidade_id,competencia" },
    );
  } catch (e) {
    // Parte já pode ter sido gravada; a próxima rodada corrige (a operação é idempotente).
    return registrar({
      ok: false,
      erro: e instanceof Error ? e.message : "Falha ao gravar a sincronização.",
      aplicado: round2(carteira.aplicado),
      patrimonio: round2(carteira.patrimonio),
      ativos: carteira.posicoes.length,
      alteracoes,
    });
  }

  // Carteira nova pode ter passado de um degrau ou fechado o aporte do mês.
  // Falha aqui não desfaz a sincronização — a próxima avaliação pega.
  try {
    await avaliarConquistas(supabase);
  } catch (e) {
    console.error("[investidor10] avaliar conquistas", e);
  }

  return registrar({
    ok: true,
    erro: null,
    aplicado: round2(carteira.aplicado),
    patrimonio: round2(carteira.patrimonio),
    ativos: carteira.posicoes.length,
    alteracoes,
  });
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}
