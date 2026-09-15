import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { hojeSP } from "@/lib/bank/agente/datas";
import { valorInvestido } from "@/lib/bank/calculos";
import { obterPatrimonioArthur } from "@/lib/bank/arthur";
import { montarPanoramaSemanal } from "@/lib/bank/semanas";
import { aaaammDe, carregarPlano, rotuloValor, type PlanoCompleto } from "@/lib/bank/plano";

// Medalhas da família (decisão do Arlison, 14/set/2026).
//
// Três regras de desenho, pra incentivar sem virar frustração:
// 1. Medalha conquistada nunca se perde. A carteira cair abaixo de R$ 100 mil
//    não apaga a medalha dos R$ 100 mil — a tabela só recebe insert.
// 2. A maioria premia o que a família CONTROLA: aportar, lançar a semana,
//    adiantar parcela. Rentabilidade não é hábito.
// 3. Sempre existe uma "ao alcance", com a barra do quanto falta.
//
// O catálogo vive aqui (versionado); o banco guarda só o que aconteceu e
// quando. `referencia_data` é a data do FATO (o mês em que a carteira passou
// do degrau), não a do dia em que o sistema percebeu — é por ela que a
// reunião trimestral sabe o que foi conquistado naquele trimestre.

import type { Nivel, SeloHistoria, TomComemoracao, Trilha } from "@/lib/bank/conquistas-visual";

type Contexto = {
  hoje: string;
  patrimonio: number;
  fotos: Array<{ mes: number; valor: number }>;
  plano: PlanoCompleto;
  maiorSequenciaAporte: { meses: number; mes: number | null };
  aportes: PlanoCompleto["aportes"];
  parcelas: Array<{ paga: boolean; adiantada: boolean; valor_juros: number; paga_em: string | null }>;
  semanas: Array<{ inicio: string; fim: string; gasto: number; meta: number | null }>;
  arthur: number;
  santander: { pagas: number; total: number; quitada: boolean; ultimoPagamento: string | null; quitacaoPrevista: string | null } | null;
};

type Avaliacao = { conquistada: boolean; data?: string; atual: number; alvo: number; detalhe?: Record<string, unknown> };

export type DefinicaoConquista = {
  codigo: string;
  trilha: Trilha;
  nivel: Nivel;
  emoji: string;
  nome: string;
  descricao: string; // o que precisa acontecer
  frase: string; // o que a comemoração diz
  selo?: SeloHistoria; // selos da história têm desenho próprio
  tom?: TomComemoracao; // padrão: festa
  avaliar: (c: Contexto) => Avaliacao;
};

// ---------- Selos da história (decisão do Arlison, 15/set/2026) ----------
// Marcos de uma vida sem controle que viraram um plano. Ficam sempre no topo,
// e "é sempre bom lembrar": abrem a vitrine e a reunião trimestral. Os dois
// primeiros são fatos com data (não se avaliam, só se registram); o Fim do
// Santander é o único "em construção" e mostra as parcelas pagas.
// Texto: só o título e a data (decisão do Arlison) — a história é dele, não
// cabe ao sistema narrar.
const SELOS_HISTORIA: DefinicaoConquista[] = [
  {
    codigo: "historia_fundo_do_poco",
    trilha: "historia",
    nivel: "diamante",
    emoji: "🕳️",
    selo: "fundo_do_poco",
    tom: "sobrio",
    nome: "Fundo do Poço",
    descricao: "08/05/2024",
    frase: "08/05/2024",
    avaliar: () => ({ conquistada: true, data: "2024-05-08", atual: 1, alvo: 1 }),
  },
  {
    codigo: "historia_negociacao_bb",
    trilha: "historia",
    nivel: "diamante",
    emoji: "🚦",
    selo: "negociacao_bb",
    nome: "Negociação com BB",
    descricao: "22/06/2026",
    frase: "22/06/2026",
    avaliar: () => ({ conquistada: true, data: "2026-06-22", atual: 1, alvo: 1 }),
  },
  {
    codigo: "historia_fim_santander",
    trilha: "historia",
    nivel: "diamante",
    emoji: "⛓️‍💥",
    selo: "fim_santander",
    nome: "Fim do Santander",
    descricao: "Em construção",
    frase: "Fim do Santander",
    avaliar: (c) => {
      const s = c.santander;
      if (s?.quitada) return { conquistada: true, data: s.ultimoPagamento ?? c.hoje, atual: s.total, alvo: s.total };
      return {
        conquistada: false,
        atual: s?.pagas ?? 0,
        alvo: Math.max(1, s?.total ?? 1),
        detalhe: { quitacaoPrevista: s?.quitacaoPrevista ?? null, pagas: s?.pagas ?? 0, total: s?.total ?? 0 },
      };
    },
  },
];

const inicioDoMes = (aaaamm: number) => `${Math.floor(aaaamm / 100)}-${String(aaaamm % 100).padStart(2, "0")}-01`;

function degrau(valor: number, nivel: Nivel, emoji: string, frase: string): DefinicaoConquista {
  const nome = rotuloValor(valor);
  return {
    codigo: `degrau_${valor}`,
    trilha: "degraus",
    nivel,
    emoji,
    nome,
    descricao: `Carteira passar de ${nome}.`,
    frase,
    avaliar: (c) => {
      const foto = c.fotos.find((f) => f.valor >= valor);
      if (foto) return { conquistada: true, data: inicioDoMes(foto.mes), atual: valor, alvo: valor };
      if (c.patrimonio >= valor) return { conquistada: true, data: c.hoje, atual: valor, alvo: valor };
      return { conquistada: false, atual: c.patrimonio, alvo: valor };
    },
  };
}

function sequenciaAporte(meses: number, nivel: Nivel, frase: string): DefinicaoConquista {
  return {
    codigo: `aporte_sequencia_${meses}`,
    trilha: "aporte",
    nivel,
    emoji: "🔥",
    nome: `${meses} meses seguidos`,
    descricao: `Cumprir o aporte do plano ${meses} meses seguidos.`,
    frase,
    avaliar: (c) =>
      c.maiorSequenciaAporte.meses >= meses
        ? { conquistada: true, data: inicioDoMes(c.maiorSequenciaAporte.mes!), atual: meses, alvo: meses }
        : { conquistada: false, atual: c.plano.sequencia, alvo: meses },
  };
}

function adiantadas(n: number, nivel: Nivel, frase: string): DefinicaoConquista {
  return {
    codigo: `divida_adiantadas_${n}`,
    trilha: "divida",
    nivel,
    emoji: "⏩",
    nome: n === 1 ? "Primeira parcela adiantada" : `${n} parcelas adiantadas`,
    descricao: `Adiantar ${n === 1 ? "uma parcela" : `${n} parcelas`} do fim do cronograma.`,
    frase,
    avaliar: (c) => {
      const lista = c.parcelas.filter((p) => p.paga && p.adiantada).sort((a, b) => String(a.paga_em).localeCompare(String(b.paga_em)));
      return lista.length >= n
        ? { conquistada: true, data: lista[n - 1].paga_em ?? c.hoje, atual: n, alvo: n }
        : { conquistada: false, atual: lista.length, alvo: n };
    },
  };
}

function jurosEconomizados(valor: number, nivel: Nivel, frase: string): DefinicaoConquista {
  return {
    codigo: `divida_juros_${valor}`,
    trilha: "divida",
    nivel,
    emoji: "✂️",
    nome: `R$ ${(valor / 1000).toLocaleString("pt-BR")} mil de juros cortados`,
    descricao: `Economizar R$ ${valor.toLocaleString("pt-BR")} de juros adiantando parcelas.`,
    frase,
    avaliar: (c) => {
      const lista = c.parcelas.filter((p) => p.paga && p.adiantada).sort((a, b) => String(a.paga_em).localeCompare(String(b.paga_em)));
      let soma = 0;
      for (const p of lista) {
        soma += p.valor_juros;
        if (soma >= valor) return { conquistada: true, data: p.paga_em ?? c.hoje, atual: valor, alvo: valor };
      }
      return { conquistada: false, atual: soma, alvo: valor };
    },
  };
}

function semanasSeguidas(n: number, nivel: Nivel, emoji: string, frase: string): DefinicaoConquista {
  return {
    codigo: n === 1 ? "semana_meta_1" : `semana_seguidas_${n}`,
    trilha: "semana",
    nivel,
    emoji,
    nome: n === 1 ? "Semana dentro da meta" : `${n} semanas seguidas na meta`,
    descricao: n === 1 ? "Fechar uma semana dentro da meta." : `Fechar ${n} semanas seguidas dentro da meta.`,
    frase,
    avaliar: (c) => {
      let seguidas = 0;
      for (const s of c.semanas) {
        seguidas = s.meta != null && s.gasto <= s.meta ? seguidas + 1 : 0;
        if (seguidas >= n) return { conquistada: true, data: s.fim, atual: n, alvo: n };
      }
      return { conquistada: false, atual: seguidas, alvo: n };
    },
  };
}

function arthur(valor: number, nivel: Nivel, frase: string): DefinicaoConquista {
  return {
    codigo: `arthur_${valor}`,
    trilha: "arthur",
    nivel,
    emoji: "👦",
    nome: `Arthur com ${rotuloValor(valor)}`,
    descricao: `Carteira do Arthur passar de ${rotuloValor(valor)}.`,
    frase,
    avaliar: (c) =>
      c.arthur >= valor
        ? { conquistada: true, data: c.hoje, atual: valor, alvo: valor }
        : { conquistada: false, atual: c.arthur, alvo: valor },
  };
}

export const CATALOGO: DefinicaoConquista[] = [
  ...SELOS_HISTORIA,
  degrau(50_000, "bronze", "🌰", "Os primeiros R$ 50 mil são os mais difíceis. Esses já são de vocês."),
  degrau(100_000, "bronze", "🌱", "Seis dígitos. A partir daqui os juros começam a ser notados."),
  degrau(250_000, "prata", "🌿", "Um quarto de milhão construído aporte por aporte."),
  degrau(500_000, "prata", "🌳", "Meio milhão. Os rendimentos de um ano já valem um salário."),
  degrau(1_000_000, "ouro", "🏡", "O primeiro milhão. O mais lento de todos — os próximos vêm mais rápido."),
  degrau(2_000_000, "ouro", "⛰️", "Dois milhões. O dinheiro trabalha mais que o aporte."),
  degrau(3_000_000, "diamante", "🚀", "Metade da meta final."),
  degrau(6_000_000, "diamante", "🏆", "A meta. Liberdade financeira da família Andrade Muller."),

  {
    codigo: "aporte_primeiro",
    trilha: "aporte",
    nivel: "bronze",
    emoji: "💵",
    nome: "Primeiro aporte do plano",
    descricao: "Cumprir o aporte do primeiro mês do plano.",
    frase: "A primeira parte do salário que foi pra vocês antes de ir pra qualquer outro lugar.",
    avaliar: (c) => {
      const primeiro = c.aportes.find((a) => a.cumprido);
      return primeiro
        ? { conquistada: true, data: inicioDoMes(primeiro.mes), atual: 1, alvo: 1 }
        : { conquistada: false, atual: 0, alvo: 1 };
    },
  },
  sequenciaAporte(3, "bronze", "Três meses seguidos. Já não é sorte, é decisão."),
  sequenciaAporte(6, "prata", "Seis meses seguidos. O hábito está virando patrimônio."),
  sequenciaAporte(12, "ouro", "Um ano inteiro sem falhar um aporte."),
  sequenciaAporte(24, "diamante", "Dois anos seguidos. Isso é quem vocês são agora."),
  {
    codigo: "aporte_dobro",
    trilha: "aporte",
    nivel: "prata",
    emoji: "⚡",
    nome: "Aporte em dobro",
    descricao: "Aportar o dobro do que o plano pede num mês.",
    frase: "Um mês aportando o dobro adianta a escada inteira.",
    avaliar: (c) => {
      const valendo = c.aportes.filter((a) => !a.reorganizacao);
      const mes = valendo.find((a) => a.realizado != null && a.realizado >= 2 * a.planejado);
      const melhor = Math.max(0, ...valendo.map((a) => (a.realizado ?? 0) / Math.max(1, a.planejado)));
      return mes
        ? { conquistada: true, data: inicioDoMes(mes.mes), atual: 2, alvo: 2 }
        : { conquistada: false, atual: Math.min(2, melhor), alvo: 2 };
    },
  },
  {
    codigo: "aporte_rampa_alvo",
    trilha: "aporte",
    nivel: "ouro",
    emoji: "🎯",
    nome: "Aporte no alvo",
    descricao: "Cumprir o primeiro mês com o aporte-alvo do plano.",
    frase: "O aporte chegou onde tinha que chegar. Agora é só manter.",
    avaliar: (c) => {
      const alvo = c.plano.parametros.aporteAlvo;
      const mes = c.aportes.find((a) => a.cumprido && a.planejado >= alvo - 1);
      return mes
        ? { conquistada: true, data: inicioDoMes(mes.mes), atual: alvo, alvo }
        : { conquistada: false, atual: c.plano.aporteDoMesAtual.planejado, alvo };
    },
  },

  adiantadas(1, "bronze", "Cada parcela adiantada é juro que nunca vai sair do bolso."),
  adiantadas(5, "prata", "Cinco parcelas a menos no fim do contrato."),
  adiantadas(20, "ouro", "Vinte parcelas adiantadas. O Santander está com pressa de ir embora."),
  jurosEconomizados(1_000, "bronze", "Mil reais que iam pro banco e ficaram com vocês."),
  jurosEconomizados(5_000, "prata", "Cinco mil de juros cortados."),
  jurosEconomizados(10_000, "ouro", "Dez mil reais de juros que nunca vão ser pagos."),
  // "Dívida quitada" genérica saiu (15/set/2026): o Fim do Santander, na trilha
  // da história, é essa medalha — ter as duas contaria o mesmo fato duas vezes.

  semanasSeguidas(1, "bronze", "✅", "Uma semana inteira dentro do combinado."),
  semanasSeguidas(4, "prata", "📅", "Um mês de semanas dentro da meta."),
  semanasSeguidas(12, "ouro", "🧭", "Três meses no controle, semana a semana."),
  semanasSeguidas(26, "diamante", "👑", "Meio ano de semanas na meta. Orçamento virou rotina."),

  arthur(10_000, "bronze", "O Arthur já tem os primeiros R$ 10 mil trabalhando por ele."),
  arthur(25_000, "prata", "R$ 25 mil pro futuro do Arthur."),
  arthur(50_000, "ouro", "R$ 50 mil. O Arthur vai começar a vida com vantagem."),
  arthur(100_000, "diamante", "R$ 100 mil pro Arthur."),

  {
    codigo: "fase_1",
    trilha: "fases",
    nivel: "ouro",
    emoji: "🚩",
    nome: "Fase 1 · Acelerar",
    descricao: "Concluir a primeira fase do plano.",
    frase: "Fase 1 concluída. O aporte está no alvo e a base está construída.",
    avaliar: (c) =>
      c.plano.faseAtual.numero > 1
        ? { conquistada: true, data: c.hoje, atual: 100, alvo: 100 }
        : { conquistada: false, atual: c.plano.progressoFase, alvo: 100 },
  },
  {
    codigo: "fase_2",
    trilha: "fases",
    nivel: "diamante",
    emoji: "🏁",
    nome: "Fase 2 · Construir",
    descricao: "Concluir a segunda fase do plano (o primeiro milhão).",
    frase: "Fase 2 concluída. Daqui pra frente os juros puxam a maior parte.",
    avaliar: (c) =>
      c.plano.faseAtual.numero > 2
        ? { conquistada: true, data: c.hoje, atual: 100, alvo: 100 }
        : { conquistada: false, atual: c.plano.faseAtual.numero === 2 ? c.plano.progressoFase : 0, alvo: 100 },
  },
];

export const DEFINICAO_POR_CODIGO = new Map(CATALOGO.map((d) => [d.codigo, d]));

export type EstadoConquista = {
  codigo: string;
  trilha: Trilha;
  nivel: Nivel;
  emoji: string;
  nome: string;
  descricao: string;
  frase: string;
  selo?: SeloHistoria;
  tom?: TomComemoracao;
  detalhe?: Record<string, unknown>;
  conquistada: boolean;
  data: string | null; // referencia_data
  progresso: number; // 0–100
  atual: number;
  alvo: number;
};

/** Leitura da carteira da família a partir das posições espelhadas. */
export async function lerCarteiraFamilia(supabase: SupabaseClient) {
  const [{ data: posicoes }, { data: cotacoes }] = await Promise.all([
    supabase.from("posicao_ativos").select("ativo_id, quantidade_atual, preco_medio").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual"),
  ]);
  const cotacoesMap = new Map((cotacoes ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]));
  const abertas = (posicoes ?? []).filter((p) => Number(p.quantidade_atual) > 0);
  return {
    patrimonio: valorInvestido(abertas, cotacoesMap),
    aplicado: abertas.reduce((s, p) => s + Number(p.quantidade_atual) * Number(p.preco_medio ?? 0), 0),
    cotacoesMap,
  };
}

/**
 * Avalia o catálogo inteiro contra os dados, grava as medalhas novas
 * (idempotente: unique por código, e nunca apaga) e devolve o estado de
 * todas — conquistadas com data, bloqueadas com progresso.
 */
export async function avaliarConquistas(supabase: SupabaseClient): Promise<EstadoConquista[]> {
  const hoje = hojeSP();
  const carteira = await lerCarteiraFamilia(supabase);

  const [plano, { data: fotos }, { data: parcelas }, { data: dividas }, panorama, patrimonioArthur, { data: gravadas }] =
    await Promise.all([
      carregarPlano(supabase, { patrimonio: carteira.patrimonio, aplicado: carteira.aplicado }),
      supabase
        .from("snapshots_patrimonio")
        .select("competencia, valor_mercado")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("competencia"),
      supabase
        .from("parcelas_divida")
        .select("divida_id, paga, adiantada, valor_juros, paga_em, data_vencimento, divida:dividas!inner(entidade_id)")
        .eq("divida.entidade_id", ENTIDADE_FAMILIA),
      supabase.from("dividas").select("id, descricao, quitada, parcelas_total").eq("entidade_id", ENTIDADE_FAMILIA),
      montarPanoramaSemanal(supabase, ENTIDADE_FAMILIA, { semanas: 60 }),
      obterPatrimonioArthur(supabase, carteira.cotacoesMap),
      supabase.from("conquistas").select("codigo, referencia_data").eq("entidade_id", ENTIDADE_FAMILIA),
    ]);

  // Maior sequência de aportes cumpridos já registrada (e o mês em que fechou).
  let atual = 0;
  const maior = { meses: 0, mes: null as number | null };
  for (const a of plano.aportes) {
    atual = a.cumprido ? atual + 1 : 0;
    if (atual > maior.meses) {
      maior.meses = atual;
      maior.mes = a.mes;
    }
  }

  const listaParcelas = (parcelas ?? []).map((p) => ({
    divida_id: String(p.divida_id),
    paga: !!p.paga,
    adiantada: !!p.adiantada,
    valor_juros: Number(p.valor_juros ?? 0),
    paga_em: p.paga_em ? String(p.paga_em) : null,
    data_vencimento: String(p.data_vencimento),
  }));

  // O contrato que nasceu da negociação com o BB. Se um dia houver mais de um
  // Santander (recadastro), vale o que ainda tem parcela em aberto.
  const contratos = (dividas ?? []).filter((d) => /santander/i.test(String(d.descricao)));
  const contrato = contratos.find((d) => !d.quitada) ?? contratos[0];
  const doContrato = contrato ? listaParcelas.filter((p) => p.divida_id === contrato.id) : [];
  const santander = contrato
    ? {
        pagas: doContrato.filter((p) => p.paga).length,
        total: doContrato.length || Number(contrato.parcelas_total ?? 0),
        quitada: !!contrato.quitada,
        ultimoPagamento: doContrato.map((p) => p.paga_em).filter((d): d is string => !!d).sort().pop() ?? null,
        quitacaoPrevista: doContrato.filter((p) => !p.paga).map((p) => p.data_vencimento).sort().pop() ?? null,
      }
    : null;

  const contexto: Contexto = {
    hoje,
    patrimonio: carteira.patrimonio,
    fotos: (fotos ?? []).map((f) => ({ mes: aaaammDe(String(f.competencia)), valor: Number(f.valor_mercado) })),
    plano,
    maiorSequenciaAporte: maior,
    aportes: plano.aportes.filter((a) => a.mes < plano.hoje || a.cumprido),
    parcelas: listaParcelas,
    santander,
    semanas: [...panorama.anteriores].sort((a, b) => a.inicio.localeCompare(b.inicio)),
    arthur: patrimonioArthur.atual,
  };

  const jaGravadas = new Map((gravadas ?? []).map((g) => [g.codigo, String(g.referencia_data)]));
  const novas: Array<{ entidade_id: string; codigo: string; referencia_data: string; detalhe: Record<string, unknown> }> = [];

  const estados = CATALOGO.map((def): EstadoConquista => {
    const a = def.avaliar(contexto);
    const gravada = jaGravadas.get(def.codigo);
    if (!gravada && a.conquistada) {
      novas.push({
        entidade_id: ENTIDADE_FAMILIA,
        codigo: def.codigo,
        referencia_data: a.data ?? hoje,
        detalhe: a.detalhe ?? {},
      });
    }
    const conquistada = !!gravada || a.conquistada;
    const { avaliar: _avaliar, ...info } = def;
    void _avaliar;
    return {
      ...info,
      detalhe: a.detalhe,
      conquistada,
      data: gravada ?? (a.conquistada ? (a.data ?? hoje) : null),
      atual: a.atual,
      alvo: a.alvo,
      progresso: conquistada ? 100 : Math.max(0, Math.min(99, (a.atual / Math.max(1e-9, a.alvo)) * 100)),
    };
  });

  if (novas.length > 0) {
    await supabase.from("conquistas").upsert(novas, { onConflict: "entidade_id,codigo", ignoreDuplicates: true });
  }

  return estados;
}

/** Medalhas gravadas que ainda não tiveram comemoração no site. */
export async function conquistasParaCelebrar(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("conquistas")
    .select("codigo, referencia_data")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .is("celebrada_em", null)
    .order("referencia_data");
  return (data ?? [])
    .map((c) => DEFINICAO_POR_CODIGO.get(c.codigo))
    .filter((d): d is DefinicaoConquista => !!d)
    .map(({ codigo, emoji, nivel, nome, frase, selo, tom }) => ({ codigo, emoji, nivel, nome, frase, selo, tom }));
}

/**
 * Avalia e devolve o texto do anúncio das medalhas ainda não anunciadas no
 * grupo, já marcando como anunciadas. Chamado pelo resumo diário/semanal —
 * o mesmo caminho que o n8n já usa pra falar no grupo.
 */
export async function anunciarConquistasNovas(supabase: SupabaseClient): Promise<string> {
  await avaliarConquistas(supabase);
  const { data } = await supabase
    .from("conquistas")
    .select("codigo")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .is("anunciada_em", null)
    .order("referencia_data");
  const codigos = (data ?? []).map((c) => c.codigo).filter((c) => DEFINICAO_POR_CODIGO.has(c));
  if (codigos.length === 0) return "";
  await supabase
    .from("conquistas")
    .update({ anunciada_em: new Date().toISOString() })
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .in("codigo", codigos);
  return textoAnuncio(codigos);
}

/** As bloqueadas mais perto de sair — o "ao alcance". */
export function aoAlcance(estados: EstadoConquista[], quantas = 3) {
  return estados
    .filter((e) => e.trilha !== "historia" && !e.conquistada && e.progresso > 0)
    .sort((a, b) => b.progresso - a.progresso)
    .slice(0, quantas);
}

/** Texto do anúncio no grupo — curto, uma linha por medalha. */
export function textoAnuncio(codigos: string[]): string {
  const todas = codigos.map((c) => DEFINICAO_POR_CODIGO.get(c)).filter((d): d is DefinicaoConquista => !!d);
  // Selo de fato passado não é "conquista desbloqueada": é a história entrando
  // no plano. Só o Fim do Santander, quando chegar, é anunciado como vitória.
  const passado = todas.filter((d) => d.trilha === "historia" && d.codigo !== "historia_fim_santander");
  const defs = todas.filter((d) => !passado.includes(d));
  const blocos: string[] = [];
  if (passado.length > 0) {
    blocos.push(
      `🧭 A história de vocês agora está no plano.\n` + passado.map((d) => `${d.emoji} ${d.nome} — ${d.descricao}`).join("\n"),
    );
  }
  const vitorias = textoVitorias(defs);
  if (vitorias) blocos.push(vitorias);
  return blocos.join("\n\n");
}

function textoVitorias(defs: DefinicaoConquista[]): string {
  if (defs.length === 0) return "";
  if (defs.length === 1) {
    const d = defs[0];
    return `🏅 Conquista desbloqueada!\n${d.emoji} ${d.nome}\n${d.frase}`;
  }
  return (
    `🏅 ${defs.length} conquistas desbloqueadas!\n` +
    defs.map((d) => `${d.emoji} ${d.nome}`).join("\n") +
    `\n\nA coleção: https://andrademuller.vercel.app/bank/plano`
  );
}
