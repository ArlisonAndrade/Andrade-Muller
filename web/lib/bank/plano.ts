import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { hojeSP } from "@/lib/bank/agente/datas";

// O plano patrimonial da família, calculado — nunca semeado.
//
// Decisões do Arlison (14/set/2026):
// - "patrimônio hoje" é algo palpável: a carteira a mercado, espelhada do
//   Investidor10. Nada de saldo de fluxo de caixa.
// - O futuro sai dos PARÂMETROS que ele edita, e deles saem fases, marcos e %.
// - Aporte com crescimento brusco até R$ 5 mil/mês em set/2029 (a data em que
//   ele quer a dívida do Santander fora do caminho), depois só reajuste.
//
// A curva antiga (tabela plano_patrimonio, apagada na migration 19) subia o
// aporte 20% ao ano pra sempre — R$ 66 mil/mês em 2049 — e cobrava R$ 174 mil
// em 2026 de uma carteira de R$ 58 mil. Plano impossível desmotiva.
//
// Tudo aqui é função pura (roda no servidor e no simulador do cliente), menos
// `carregarPlano`, que lê o banco.

export type ParametrosPlano = {
  inicio: number; // AAAAMM do marco zero (jun/2026: a negociação com o BB)
  valorInicial: number; // carteira no marco zero (linha de base do "real vs plano")
  inicioPlacar: number; // AAAAMM em que o placar do aporte passa a valer (e a rampa começa)
  aporteInicial: number;
  aporteAlvo: number;
  rampaFim: number; // AAAAMM em que o aporte chega no alvo
  reajusteAa: number; // % ao ano sobre o aporte depois da rampa
  rentabilidadeAa: number; // % ao ano
  metaFinal: number;
  anoMeta: number;
};

export const PARAMETROS_PADRAO: ParametrosPlano = {
  inicio: 202606, // negociação com o BB em 22/06/2026
  valorInicial: 56248.39, // foto de jun/2026
  inicioPlacar: 202610,
  aporteInicial: 1000,
  aporteAlvo: 5000,
  rampaFim: 202909,
  reajusteAa: 5,
  rentabilidadeAa: 10,
  metaFinal: 6_000_000,
  anoMeta: 2049,
};

/** chave em parametros_plano → campo */
export const CHAVES_PLANO: Record<keyof ParametrosPlano, string> = {
  inicio: "plano_inicio",
  valorInicial: "plano_valor_inicial",
  inicioPlacar: "plano_inicio_placar",
  aporteInicial: "plano_aporte_inicial",
  aporteAlvo: "plano_aporte_alvo",
  rampaFim: "plano_rampa_fim",
  reajusteAa: "plano_reajuste_aa",
  rentabilidadeAa: "plano_rentabilidade_aa",
  metaFinal: "plano_meta_final",
  anoMeta: "plano_ano_meta",
};

// ---------- meses como número (AAAAMM ↔ índice contínuo) ----------
export const indiceMes = (aaaamm: number) => Math.floor(aaaamm / 100) * 12 + ((aaaamm % 100) - 1);
export const mesDoIndice = (i: number) => Math.floor(i / 12) * 100 + (i % 12) + 1;
export const somarMeses = (aaaamm: number, n: number) => mesDoIndice(indiceMes(aaaamm) + n);
export const aaaammDe = (iso: string) => Number(iso.slice(0, 4)) * 100 + Number(iso.slice(5, 7));
export const mesAtual = () => aaaammDe(hojeSP());

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const rotuloMes = (aaaamm: number) => `${MESES[(aaaamm % 100) - 1]}/${Math.floor(aaaamm / 100)}`;

/**
 * Aporte que o plano pede num mês: o inicial até o placar começar, rampa
 * linear até o alvo, depois reajuste anual. A rampa parte do placar (out/2026)
 * e não do marco zero: os meses de reorganização não podem encarecer outubro.
 */
export function aporteDoMes(p: ParametrosPlano, aaaamm: number): number {
  const i = indiceMes(aaaamm);
  const ini = indiceMes(Math.max(p.inicio, p.inicioPlacar));
  const fim = indiceMes(p.rampaFim);
  if (i <= ini) return p.aporteInicial;
  if (i < fim) return p.aporteInicial + ((p.aporteAlvo - p.aporteInicial) * (i - ini)) / (fim - ini);
  const anosDepois = Math.floor((i - fim) / 12);
  return p.aporteAlvo * Math.pow(1 + p.reajusteAa / 100, anosDepois);
}

export type PontoMes = { mes: number; valor: number; aporte: number };

/**
 * Projeta mês a mês: o valor de `deMes` é `valorInicial` (já com o aporte
 * daquele mês feito) e cada mês seguinte rende e recebe o aporte do plano.
 */
export function projetarMeses(p: ParametrosPlano, valorInicial: number, deMes: number, ateMes: number): PontoMes[] {
  const taxa = Math.pow(1 + p.rentabilidadeAa / 100, 1 / 12) - 1;
  const pontos: PontoMes[] = [{ mes: deMes, valor: valorInicial, aporte: 0 }];
  let valor = valorInicial;
  for (let i = indiceMes(deMes) + 1; i <= indiceMes(ateMes); i++) {
    const mes = mesDoIndice(i);
    const aporte = aporteDoMes(p, mes);
    valor = valor * (1 + taxa) + aporte;
    pontos.push({ mes, valor, aporte });
  }
  return pontos;
}

export const MARCOS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 3_000_000];

export function rotuloValor(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${v >= 2_000_000 ? "milhões" : "milhão"}`;
  return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
}

/** Primeiro mês em que a projeção alcança o valor (null se não alcança no horizonte). */
export const mesQueAlcanca = (pontos: PontoMes[], alvo: number) => pontos.find((q) => q.valor >= alvo)?.mes ?? null;

export type Fase = {
  numero: number;
  nome: string;
  descricao: string;
  deMes: number;
  ateMes: number | null; // previsto pelo plano
  valorInicio: number;
  valorAlvo: number;
};

export function fasesDoPlano(p: ParametrosPlano, curva: PontoMes[]): Fase[] {
  const valorNaRampa = curva.find((q) => q.mes === p.rampaFim)?.valor ?? p.valorInicial;
  const umMilhao = Math.max(1_000_000, valorNaRampa);
  return [
    {
      numero: 1,
      nome: "Acelerar",
      descricao: `Aporte sobe de R$ ${p.aporteInicial.toLocaleString("pt-BR")} até R$ ${p.aporteAlvo.toLocaleString("pt-BR")}/mês e a dívida sai do caminho.`,
      deMes: p.inicio,
      ateMes: p.rampaFim,
      valorInicio: p.valorInicial,
      valorAlvo: valorNaRampa,
    },
    {
      numero: 2,
      nome: "Construir",
      descricao: "Aporte cheio, reajustado todo ano, até o primeiro milhão.",
      deMes: p.rampaFim,
      ateMes: mesQueAlcanca(curva, umMilhao),
      valorInicio: valorNaRampa,
      valorAlvo: umMilhao,
    },
    {
      numero: 3,
      nome: "Multiplicar",
      descricao: `Os juros passam a trabalhar mais que o aporte, até ${rotuloValor(p.metaFinal)}.`,
      deMes: mesQueAlcanca(curva, umMilhao) ?? p.rampaFim,
      ateMes: mesQueAlcanca(curva, p.metaFinal),
      valorInicio: umMilhao,
      valorAlvo: p.metaFinal,
    },
  ];
}

// ---------- leitura do banco ----------

export function lerParametros(linhas: Array<{ chave: string; valor: number | string }> | null): ParametrosPlano {
  const mapa = new Map((linhas ?? []).map((l) => [l.chave, Number(l.valor)]));
  const p = { ...PARAMETROS_PADRAO };
  for (const campo of Object.keys(CHAVES_PLANO) as (keyof ParametrosPlano)[]) {
    const v = mapa.get(CHAVES_PLANO[campo]);
    if (v != null && Number.isFinite(v)) p[campo] = v;
  }
  return p;
}

export type AporteMensal = {
  mes: number;
  planejado: number;
  realizado: number | null;
  informado: boolean; // veio de aportes_mensais, não do cálculo
  reorganizacao: boolean; // antes do placar: mostra, não pontua
  cumprido: boolean | null;
};

export type PlanoCompleto = {
  parametros: ParametrosPlano;
  hoje: number; // AAAAMM
  patrimonioHoje: number;
  aplicadoHoje: number;
  curvaPlano: PontoMes[]; // linha de base: do início do plano até dez do ano-meta
  ritmoAtual: PontoMes[]; // de hoje, com a carteira real, até dez do ano-meta
  planejadoHoje: number;
  desvio: number; // R$ (real − plano)
  desvioPct: number;
  fases: Fase[];
  faseAtual: Fase;
  progressoFase: number; // 0–100
  proximoMarco: { valor: number; mesPrevisto: number | null; progresso: number } | null;
  marcos: Array<{ valor: number; atingido: boolean; mesPlano: number | null; mesRitmo: number | null }>;
  aportes: AporteMensal[]; // meses do plano até hoje
  aporteDoMesAtual: { planejado: number; realizado: number; informado: boolean };
  antesDoPlacar: boolean; // ainda nos meses de reorganização
  construidoDesdeMarcoZero: number; // carteira hoje − carteira no marco zero
  sequencia: number; // meses seguidos com aporte cumprido
  mesDaMeta: number | null; // no ritmo atual
};

/** Aporte do mês pelo plano — usado pelo score de saúde. */
export async function aporteDoMesPlanejado(supabase: SupabaseClient, hojeData = new Date()): Promise<number> {
  const { data } = await supabase.from("parametros_plano").select("chave, valor").eq("entidade_id", ENTIDADE_FAMILIA);
  const p = lerParametros(data);
  const mes = hojeData.getFullYear() * 100 + hojeData.getMonth() + 1;
  return aporteDoMes(p, Math.max(mes, p.inicio));
}

/**
 * Tudo que a página do plano (e o Modo TV) precisa. A carteira de hoje vem
 * das posições espelhadas do Investidor10; o aporte realizado de cada mês é
 * o quanto o aplicado cresceu contra a foto do mês anterior.
 */
export async function carregarPlano(
  supabase: SupabaseClient,
  carteira: { patrimonio: number; aplicado: number },
): Promise<PlanoCompleto> {
  const [{ data: linhas }, { data: fotos }, { data: informados }] = await Promise.all([
    supabase.from("parametros_plano").select("chave, valor").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase
      .from("snapshots_patrimonio")
      .select("competencia, valor_aplicado")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .order("competencia"),
    supabase.from("aportes_mensais").select("mes, valor").eq("entidade_id", ENTIDADE_FAMILIA),
  ]);
  const p = lerParametros(linhas);
  const hoje = mesAtual();
  const fim = p.anoMeta * 100 + 12;

  const curvaPlano = projetarMeses(p, p.valorInicial, p.inicio, fim);
  const ritmoAtual = projetarMeses(p, carteira.patrimonio, Math.max(hoje, p.inicio), fim);

  const planejadoHoje = curvaPlano.find((q) => q.mes === hoje)?.valor ?? p.valorInicial;
  const desvio = carteira.patrimonio - planejadoHoje;
  const desvioPct = planejadoHoje > 0 ? (desvio / planejadoHoje) * 100 : 0;

  // Aporte realizado por mês: o informado pela família, se houver; senão o
  // aplicado da foto do mês − aplicado da foto anterior. O informado vence
  // porque o aplicado mente quando o aporte sai da reserva (ver migration 21).
  const aplicadoPorMes = new Map<number, number>();
  for (const f of fotos ?? []) aplicadoPorMes.set(aaaammDe(String(f.competencia)), Number(f.valor_aplicado));
  aplicadoPorMes.set(hoje, carteira.aplicado); // o mês corrente usa o número vivo
  const informadoPorMes = new Map((informados ?? []).map((a) => [aaaammDe(String(a.mes)), Number(a.valor)]));

  const aportes: AporteMensal[] = [];
  for (let i = indiceMes(p.inicio); i <= indiceMes(hoje); i++) {
    const mes = mesDoIndice(i);
    const planejado = aporteDoMes(p, mes);
    const atual = aplicadoPorMes.get(mes);
    const anterior = aplicadoPorMes.get(mesDoIndice(i - 1));
    const informado = informadoPorMes.get(mes);
    const realizado = informado ?? (atual != null && anterior != null ? atual - anterior : null);
    // Antes do placar é reorganização: mostra o que entrou, mas não conta
    // como cumprido nem como falha (sequência e medalhas ignoram).
    const reorganizacao = mes < p.inicioPlacar;
    aportes.push({
      mes,
      planejado,
      realizado,
      informado: informado != null,
      reorganizacao,
      cumprido: reorganizacao || realizado == null ? null : realizado >= planejado - 1,
    });
  }

  // Sequência: meses fechados seguidos com aporte cumprido. O mês corrente só
  // soma se já foi cumprido — ainda não ter aportado dia 14 não quebra nada.
  let sequencia = 0;
  for (let k = aportes.length - 1; k >= 0; k--) {
    const a = aportes[k];
    if (a.mes === hoje && !a.cumprido) continue;
    if (a.cumprido) sequencia++;
    else break;
  }

  const fases = fasesDoPlano(p, curvaPlano);
  const faseAtual =
    hoje < p.rampaFim
      ? fases[0]
      : carteira.patrimonio < fases[1].valorAlvo
        ? fases[1]
        : fases[2];
  const progressoFase = Math.max(
    0,
    Math.min(100, ((carteira.patrimonio - faseAtual.valorInicio) / Math.max(1, faseAtual.valorAlvo - faseAtual.valorInicio)) * 100),
  );

  const todosMarcos = [...MARCOS.filter((m) => m < p.metaFinal), p.metaFinal];
  const marcos = todosMarcos.map((valor) => ({
    valor,
    atingido: carteira.patrimonio >= valor,
    mesPlano: mesQueAlcanca(curvaPlano, valor),
    mesRitmo: carteira.patrimonio >= valor ? null : mesQueAlcanca(ritmoAtual, valor),
  }));
  const proximo = marcos.find((m) => !m.atingido);
  const marcoAnterior = [...todosMarcos].reverse().find((m) => m <= carteira.patrimonio) ?? 0;

  const doMes = aportes.find((a) => a.mes === hoje);

  return {
    parametros: p,
    hoje,
    patrimonioHoje: carteira.patrimonio,
    aplicadoHoje: carteira.aplicado,
    curvaPlano,
    ritmoAtual,
    planejadoHoje,
    desvio,
    desvioPct,
    fases,
    faseAtual,
    progressoFase,
    proximoMarco: proximo
      ? {
          valor: proximo.valor,
          mesPrevisto: proximo.mesRitmo,
          progresso: Math.max(0, Math.min(100, ((carteira.patrimonio - marcoAnterior) / (proximo.valor - marcoAnterior)) * 100)),
        }
      : null,
    marcos,
    aportes,
    aporteDoMesAtual: {
      planejado: aporteDoMes(p, Math.max(hoje, p.inicio)),
      realizado: Math.max(0, doMes?.realizado ?? 0),
      informado: doMes?.informado ?? false,
    },
    antesDoPlacar: hoje < p.inicioPlacar,
    construidoDesdeMarcoZero: carteira.patrimonio - p.valorInicial,
    sequencia,
    mesDaMeta: mesQueAlcanca(ritmoAtual, p.metaFinal),
  };
}
