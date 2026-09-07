import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { projetarPatrimonio } from "@/lib/bank/projecao";

// A jornada patrimonial (2021 → ~2032) tem duas metades com origens diferentes,
// de propósito:
//
//   passado  → tabela `jornada_patrimonio` (curva curada da planilha + marcos).
//              Não dá pra reconstruir 2021-2025 de transações que não existem
//              no banco; é memória, e memória se guarda escrita.
//   presente → dados reais de hoje: carteira a mercado e o principal em aberto
//   e futuro   das parcelas ainda não pagas, projetados ano a ano.
//
// O seed antigo cobria 2026-2032 com número congelado, que envelheceu errado
// nos dois sentidos (dívida maior que a real, quitação mais cedo que a real).
// Daqui pra frente o futuro é recalculado a cada load.

export type PontoJornada = {
  ano: number;
  investimento: number;
  divida: number; // principal em aberto no fim do ano (positivo)
  liquido: number; // investimento − divida
  projetado: boolean;
  marcoEmoji: string | null;
  marcoTitulo: string | null;
};

export type Jornada = {
  pontos: PontoJornada[];
  anoAtual: number;
  anoDaVirada: number | null; // primeiro ano com líquido ≥ 0
};

const ANOS_DE_PROJECAO = 6;

export async function montarJornada(
  supabase: SupabaseClient,
  investidoHoje: number,
): Promise<Jornada> {
  const anoAtual = new Date().getFullYear();

  const [{ data: historico }, { data: parcelas }, { data: parametros }] = await Promise.all([
    supabase
      .from("jornada_patrimonio")
      .select("ano, investimento, dividas, marco_emoji, marco_titulo")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .lt("ano", anoAtual)
      .order("ano"),
    supabase
      .from("parcelas_divida")
      .select("data_vencimento, valor_amortizacao, paga, divida:dividas!inner(entidade_id, quitada)")
      .eq("paga", false)
      .eq("divida.entidade_id", ENTIDADE_FAMILIA)
      .eq("divida.quitada", false),
    supabase
      .from("parametros_plano")
      .select("chave, valor")
      .eq("entidade_id", ENTIDADE_FAMILIA),
  ]);

  const param = (chave: string, padrao: number) =>
    Number((parametros ?? []).find((p) => p.chave === chave)?.valor ?? padrao);

  // Amortização (principal) que ainda vence, por ano. Juros futuros ficam de
  // fora: não são dívida hoje e somem se o Arlison adiantar parcelas.
  const amortizacaoPorAno = new Map<number, number>();
  for (const p of parcelas ?? []) {
    const ano = Number(String(p.data_vencimento).slice(0, 4));
    amortizacaoPorAno.set(ano, (amortizacaoPorAno.get(ano) ?? 0) + Number(p.valor_amortizacao ?? 0));
  }
  const saldoDevedorHoje = [...amortizacaoPorAno.values()].reduce((s, v) => s + v, 0);
  const ultimoAnoDeDivida = Math.max(anoAtual, ...(amortizacaoPorAno.size ? [...amortizacaoPorAno.keys()] : [anoAtual]));

  // O ponto do ano corrente é o retrato de HOJE, não o fechamento de dezembro:
  // é nele que a pílula diz "você está aqui", e é ele que a faixa de números do
  // card mostra — tem que bater com o card de métrica da home, que lê a mesma
  // carteira. A projeção só começa no ano seguinte, e para isso ainda precisa
  // saber onde a carteira fecha este ano (os meses que faltam).
  const mesesRestantesNoAno = 12 - new Date().getMonth();
  const aporteMensal = param("plano6m_aporte_mensal", 1000);
  const rentabilidade = param("plano6m_rentabilidade_aa", 10);
  const crescimentoAporte = param("plano6m_crescimento_aporte_aa", 0);
  const taxaMensal = Math.pow(1 + rentabilidade / 100, 1 / 12) - 1;

  let investimentoFimDoAno = investidoHoje;
  for (let m = 0; m < mesesRestantesNoAno; m++) {
    investimentoFimDoAno = investimentoFimDoAno * (1 + taxaMensal) + aporteMensal;
  }

  const anoFinal = Math.max(anoAtual + ANOS_DE_PROJECAO, ultimoAnoDeDivida);
  const projecao = projetarPatrimonio(
    investimentoFimDoAno,
    aporteMensal * (1 + crescimentoAporte / 100),
    rentabilidade,
    anoAtual + 1,
    anoFinal,
    crescimentoAporte,
  );

  const pontos: PontoJornada[] = (historico ?? []).map((h) => {
    const investimento = Number(h.investimento);
    const divida = Number(h.dividas);
    return {
      ano: h.ano,
      investimento,
      divida,
      liquido: investimento - divida,
      projetado: false,
      marcoEmoji: h.marco_emoji,
      marcoTitulo: h.marco_titulo,
    };
  });

  let saldoRestante = saldoDevedorHoje;
  const dividaNoFimDe = (ano: number) => {
    saldoRestante -= amortizacaoPorAno.get(ano) ?? 0;
    return Math.max(0, Math.round(saldoRestante * 100) / 100);
  };

  const investimentoAtual = Math.round(investidoHoje * 100) / 100;
  const dividaAtual = Math.round(saldoDevedorHoje * 100) / 100;
  pontos.push({
    ano: anoAtual,
    investimento: investimentoAtual,
    divida: dividaAtual,
    liquido: Math.round((investimentoAtual - dividaAtual) * 100) / 100,
    projetado: false,
    marcoEmoji: null,
    marcoTitulo: null,
  });

  // As parcelas que ainda vencem neste ano saem do saldo antes do primeiro ano
  // projetado — o ponto de hoje já passou, mas o dinheiro dele não.
  saldoRestante -= amortizacaoPorAno.get(anoAtual) ?? 0;

  for (const p of projecao) {
    const divida = dividaNoFimDe(p.ano);
    pontos.push({
      ano: p.ano,
      investimento: p.valor,
      divida,
      liquido: Math.round((p.valor - divida) * 100) / 100,
      projetado: true,
      marcoEmoji: null,
      marcoTitulo: null,
    });
  }

  // Marcos calculados (não semeados): a quitação e a virada pro positivo só
  // ganham data quando a projeção diz que ganham — se o plano mudar, a data
  // anda junto em vez de mentir na tela.
  const quitacao = pontos.find((p) => p.ano >= anoAtual && p.divida === 0);
  if (quitacao && !quitacao.marcoEmoji) {
    quitacao.marcoEmoji = "🏦";
    quitacao.marcoTitulo = "Dívida quitada";
  }
  const virada = pontos.find((p) => p.ano >= anoAtual && p.liquido >= 0);
  if (virada && !virada.marcoEmoji) {
    virada.marcoEmoji = "🎯";
    virada.marcoTitulo = "Patrimônio zero";
  }

  return { pontos, anoAtual, anoDaVirada: virada?.ano ?? null };
}
