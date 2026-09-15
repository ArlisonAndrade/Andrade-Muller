import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { montarPanoramaSemanal } from "@/lib/bank/semanas";
import { obterPatrimonioArthur, obterMetaArthur } from "@/lib/bank/arthur";
import { aaaammDe, aporteDoMes, carregarPlano, mesAtual, somarMeses, type PlanoCompleto } from "@/lib/bank/plano";
import {
  aoAlcance,
  avaliarConquistas,
  lerCarteiraFamilia,
  type EstadoConquista,
} from "@/lib/bank/conquistas";

// Reunião trimestral de alinhamento financeiro (decisão do Arlison,
// 14/set/2026; a primeira em outubro/2026, fechando o 3º trimestre).
//
// Tudo aqui é leitura das mesmas fontes das outras telas — a reunião nunca
// mostra um número que o site não mostraria. O único dado próprio são os
// compromissos: a reunião de um trimestre registra o que a família combinou
// pro seguinte, e a próxima abre conferindo se foi cumprido.

export type Compromisso = { texto: string; cumprido: boolean | null };

export const trimestreDe = (aaaamm: number) => `${Math.floor(aaaamm / 100)}-T${Math.floor(((aaaamm % 100) - 1) / 3) + 1}`;

export function mesesDoTrimestre(trimestre: string): [number, number, number] {
  const ano = Number(trimestre.slice(0, 4));
  const t = Number(trimestre.slice(-1));
  const primeiro = ano * 100 + (t - 1) * 3 + 1;
  return [primeiro, primeiro + 1, primeiro + 2];
}

export const trimestreVizinho = (trimestre: string, passo: number) =>
  trimestreDe(somarMeses(mesesDoTrimestre(trimestre)[0], passo * 3));

export const rotuloTrimestre = (trimestre: string) => `${trimestre.slice(-1)}º trimestre de ${trimestre.slice(0, 4)}`;

/** A reunião olha pro trimestre que acabou de fechar. */
export const trimestrePadrao = () => trimestreVizinho(trimestreDe(mesAtual()), -1);

export type DadosTrimestre = {
  trimestre: string;
  meses: number[];
  fechado: boolean;
  carteiraInicio: number | null;
  carteiraFim: number;
  aportes: Array<{ mes: number; planejado: number | null; realizado: number | null; reorganizacao: boolean }>;
  aportadoTotal: number;
  planejadoTotal: number;
  conquistasDoTrimestre: EstadoConquista[];
  colecaoAnterior: EstadoConquista[]; // só na primeira reunião
  historia: EstadoConquista[]; // selos "De onde viemos", abrem toda reunião
  primeiraReuniao: boolean;
  plano: PlanoCompleto;
  divida: {
    parcelasPagas: number;
    adiantadas: number;
    jurosEconomizados: number;
    saldoPrincipal: number;
    quitacaoPrevista: string | null;
  };
  semanas: { dentro: number; total: number; media: number | null; meta: number | null };
  arthur: { atual: number; meta: number };
  proximo: {
    trimestre: string;
    aporteTotal: number;
    aportePorMes: Array<{ mes: number; valor: number }>;
    alcance: EstadoConquista[];
  };
  compromissosAnteriores: Compromisso[]; // combinados na reunião passada, pra conferir agora
  reuniao: { compromissos: Compromisso[]; notas: string | null } | null;
};

export async function montarTrimestre(supabase: SupabaseClient, trimestre: string): Promise<DadosTrimestre> {
  const meses = mesesDoTrimestre(trimestre);
  const hoje = mesAtual();
  const fechado = meses[2] < hoje;
  const inicioISO = `${String(meses[0]).slice(0, 4)}-${String(meses[0]).slice(4)}-01`;
  const fimISO = `${String(meses[2]).slice(0, 4)}-${String(meses[2]).slice(4)}-31`;
  const anterior = trimestreVizinho(trimestre, -1);
  const proximo = trimestreVizinho(trimestre, 1);

  const carteira = await lerCarteiraFamilia(supabase);
  const [
    plano,
    estados,
    { data: fotos },
    { data: gravadas },
    { data: parcelas },
    panorama,
    arthur,
    { data: reunioes },
  ] = await Promise.all([
    carregarPlano(supabase, { patrimonio: carteira.patrimonio, aplicado: carteira.aplicado }),
    avaliarConquistas(supabase),
    supabase
      .from("snapshots_patrimonio")
      .select("competencia, valor_aplicado, valor_mercado")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .order("competencia"),
    supabase.from("conquistas").select("codigo, referencia_data").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase
      .from("parcelas_divida")
      .select("paga, adiantada, paga_em, valor_juros, valor_amortizacao, data_vencimento, divida:dividas!inner(entidade_id, quitada)")
      .eq("divida.entidade_id", ENTIDADE_FAMILIA),
    montarPanoramaSemanal(supabase, ENTIDADE_FAMILIA, { semanas: 30 }),
    obterPatrimonioArthur(supabase, carteira.cotacoesMap),
    supabase
      .from("reunioes_trimestrais")
      .select("trimestre, compromissos, notas")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .in("trimestre", [trimestre, anterior]),
  ]);

  const porMes = new Map((fotos ?? []).map((f) => [aaaammDe(String(f.competencia)), f]));
  const aplicadoDe = (mes: number) =>
    mes === hoje ? carteira.aplicado : porMes.has(mes) ? Number(porMes.get(mes)!.valor_aplicado) : null;
  const mercadoDe = (mes: number) =>
    mes === hoje ? carteira.patrimonio : porMes.has(mes) ? Number(porMes.get(mes)!.valor_mercado) : null;

  // Mesma leitura do plano (aporte informado vence o calculado); fora do
  // período do plano, cai no crescimento do aplicado.
  const aportes = meses.map((mes) => {
    const doPlano = plano.aportes.find((a) => a.mes === mes);
    const atual = aplicadoDe(mes);
    const antes = aplicadoDe(somarMeses(mes, -1));
    return {
      mes,
      planejado: mes >= plano.parametros.inicio ? aporteDoMes(plano.parametros, mes) : null,
      realizado: doPlano ? doPlano.realizado : mes > hoje || atual == null || antes == null ? null : atual - antes,
      reorganizacao: mes < plano.parametros.inicioPlacar,
    };
  });

  // Conquistas: pela data do fato. Na primeira reunião, o que veio antes vira
  // "a coleção até aqui" — ninguém começa o jogo do zero.
  const dataPorCodigo = new Map((gravadas ?? []).map((g) => [g.codigo, String(g.referencia_data)]));
  // Selos da história têm slide próprio ("De onde viemos") em toda reunião.
  const comData = estados.filter((e) => e.trilha !== "historia" && e.conquistada && dataPorCodigo.has(e.codigo));
  const doTrimestre = comData.filter((e) => {
    const d = dataPorCodigo.get(e.codigo)!;
    return d >= inicioISO && d <= fimISO;
  });
  const primeiraReuniao = !(reunioes ?? []).some((r) => r.trimestre === anterior);
  const colecaoAnterior = primeiraReuniao ? comData.filter((e) => dataPorCodigo.get(e.codigo)! < inicioISO) : [];

  const listaParcelas = parcelas ?? [];
  const noTrimestre = (d: unknown) => d != null && String(d) >= inicioISO && String(d) <= fimISO;
  const pagasNoTri = listaParcelas.filter((p) => p.paga && noTrimestre(p.paga_em));
  const abertas = listaParcelas.filter((p) => !p.paga).sort((a, b) => String(a.data_vencimento).localeCompare(String(b.data_vencimento)));

  const semanasDoTri = panorama.anteriores.filter((s) => s.fim >= inicioISO && s.fim <= fimISO && s.meta != null);

  const mesesProximo = mesesDoTrimestre(proximo);
  const aportePorMes = mesesProximo.map((mes) => ({ mes, valor: aporteDoMes(plano.parametros, Math.max(mes, plano.parametros.inicio)) }));

  const doTrimestreRow = (reunioes ?? []).find((r) => r.trimestre === trimestre);
  const anteriorRow = (reunioes ?? []).find((r) => r.trimestre === anterior);

  return {
    trimestre,
    meses,
    fechado,
    carteiraInicio: mercadoDe(somarMeses(meses[0], -1)),
    carteiraFim: fechado ? (mercadoDe(meses[2]) ?? carteira.patrimonio) : carteira.patrimonio,
    aportes,
    aportadoTotal: aportes.reduce((s, a) => s + Math.max(0, a.realizado ?? 0), 0),
    // Reorganização não entra na régua: o trimestre só "deve" o que já é placar.
    planejadoTotal: aportes.reduce((s, a) => s + (a.reorganizacao ? 0 : (a.planejado ?? 0)), 0),
    conquistasDoTrimestre: doTrimestre,
    colecaoAnterior,
    historia: estados.filter((e) => e.trilha === "historia"),
    primeiraReuniao,
    plano,
    divida: {
      parcelasPagas: pagasNoTri.length,
      adiantadas: pagasNoTri.filter((p) => p.adiantada).length,
      jurosEconomizados: pagasNoTri.filter((p) => p.adiantada).reduce((s, p) => s + Number(p.valor_juros ?? 0), 0),
      saldoPrincipal: abertas.reduce((s, p) => s + Number(p.valor_amortizacao ?? 0), 0),
      quitacaoPrevista: abertas.length ? String(abertas[abertas.length - 1].data_vencimento) : null,
    },
    semanas: {
      dentro: semanasDoTri.filter((s) => s.gasto <= (s.meta as number)).length,
      total: semanasDoTri.length,
      media: semanasDoTri.length ? semanasDoTri.reduce((s, x) => s + x.gasto, 0) / semanasDoTri.length : null,
      meta: semanasDoTri.length ? (semanasDoTri[semanasDoTri.length - 1].meta as number) : null,
    },
    arthur: { atual: arthur.atual, meta: obterMetaArthur() },
    proximo: {
      trimestre: proximo,
      aporteTotal: aportePorMes.reduce((s, a) => s + a.valor, 0),
      aportePorMes,
      alcance: aoAlcance(estados, 4),
    },
    compromissosAnteriores: (anteriorRow?.compromissos as Compromisso[] | undefined) ?? [],
    reuniao: doTrimestreRow
      ? { compromissos: (doTrimestreRow.compromissos as Compromisso[]) ?? [], notas: doTrimestreRow.notas }
      : null,
  };
}
