import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { hojeSP } from "@/lib/bank/agente/datas";
import { DOUTRINA_ARKAD } from "@/lib/bank/agente/arkad";
import { montarDivisaoDoMes } from "@/lib/bank/divisao-mes";
import { agregarPorClasse, type Cotacao, type PosicaoDetalhada } from "@/lib/bank/calculos-investimentos";
import { lerDecisoes } from "@/lib/bank/balanco/decisoes";
import {
  balancoDoTrimestre,
  mesesDoTrimestre,
  montarTrimestre,
  trimestreVizinho,
  type Compromisso,
  type ItemBalanco,
} from "@/lib/bank/trimestre";

// Balanço Patrimonial Trimestral em PDF (pedido do Arlison, 25/out/2026: a
// reunião trimestral não acontece — "nunca dá tempo" — então o Arkad manda o
// balanço no grupo). O desenho foi aprovado num rascunho do 3T26.
//
// Os números saem de `montarTrimestre`, a mesma leitura do Modo TV: o PDF
// nunca mostra um número diferente da tela. O que só o balanço precisa
// (passivo em cada data, retiradas da reserva, posições fora da corretora) é
// lido aqui. O único texto livre é o parecer do Arkad, escrito pelo modelo a
// partir destes números — e, se a API falhar, um parecer montado à mão.

export type LinhaBalanco = { conta: string; nota?: number; inicio: number; fim: number };

export type DadosBalanco = {
  trimestre: string;
  /** "3T26" */
  sigla: string;
  proximaSigla: string;
  periodo: string;
  dataInicio: string; // fim do trimestre anterior, DD/MM/AAAA
  dataFim: string;
  emitidoEm: string; // DD/MM/AAAA
  emitidoPorExtenso: string;
  ativo: LinhaBalanco[];
  passivo: LinhaBalanco[];
  totalAtivo: { inicio: number; fim: number };
  totalPassivo: { inicio: number; fim: number };
  pl: { inicio: number; fim: number };
  /** Meses até o patrimônio líquido cruzar o zero no ritmo do trimestre. */
  mesesAteZero: number | null;
  composicao: Array<{ rotulo: string; valor: number; cor: string }>;
  notas: Array<{ n?: number; texto: string }>;
  numeros: {
    carteiraCresceu: number | null;
    carteiraCresceuPct: number | null;
    retiradas: number;
    cresceuSemRetiradas: number | null;
    cresceuSemRetiradasPct: number | null;
    rentab12M: number | null;
    rentabTotal: number | null;
    rentabApuradaEm: string | null;
    aportes: Array<{ rotulo: string; valor: number | null }>;
    aportado: number;
    planejado: number;
    reorganizacao: boolean;
    parcelasPagas: number;
    pagoDivida: number;
    amortizado: number;
    parcelasRestantes: number;
    quitacao: string | null;
    reserva: number;
    metaReserva: number;
    arthur: number;
    sobra: Array<{ nome: string; valor: number }>;
    sobraTotal: number;
    mesSobra: string;
  };
  semanas: {
    lista: Array<{ rotulo: string; gasto: number; meta: number }>;
    media: number | null;
    meta: number | null;
    dentro: number;
    total: number;
  };
  certos: ItemBalanco[];
  ajustes: ItemBalanco[];
  reuniao: { realizada: boolean; compromissos: Compromisso[] };
  /** Decisões pedidas no grupo, com a resposta de cada um (null = não respondeu). */
  decisoes: {
    pessoas: string[];
    perguntas: Array<{ numero: number; texto: string; respostas: Array<string | null>; divergente: boolean }>;
  } | null;
  compromissosAnteriores: Compromisso[];
  proximo: string[];
  parecer: string[];
};

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const ddmmaaaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ultimoDia = (aaaamm: number) => {
  const ano = Math.floor(aaaamm / 100);
  const mes = aaaamm % 100;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, "0")}`;
};
const siglaDe = (trimestre: string) => `${trimestre.slice(-1)}T${trimestre.slice(2, 4)}`;

export async function montarBalanco(supabase: SupabaseClient, trimestre: string): Promise<DadosBalanco> {
  const meses = mesesDoTrimestre(trimestre);
  const anterior = trimestreVizinho(trimestre, -1);
  const proximo = trimestreVizinho(trimestre, 1);
  const fimAnteriorISO = ultimoDia(mesesDoTrimestre(anterior)[2]);
  const inicioISO = `${String(meses[0]).slice(0, 4)}-${String(meses[0]).slice(4)}-01`;
  const fimISO = ultimoDia(meses[2]);
  const hoje = hojeSP();

  const [d, posicoes, cotacoes, parcelas, retiradas, sync, metaReserva, divisao, estadoDecisoes, decisoesAnteriores] = await Promise.all([
    montarTrimestre(supabase, trimestre),
    supabase
      .from("posicao_ativos")
      .select("ativo_id, ticker, nome, tipo, finalidade, origem, quantidade_atual, preco_medio")
      .eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual, variacao_dia_pct"),
    supabase
      .from("parcelas_divida")
      .select("paga, paga_em, valor_parcela, valor_pago_efetivo, valor_amortizacao, data_vencimento, divida:dividas!inner(entidade_id, descricao, debito_automatico)")
      .eq("divida.entidade_id", ENTIDADE_FAMILIA),
    supabase
      .from("movimentos_carteira")
      .select("valor")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("tipo", "retirada")
      .gte("data", inicioISO)
      .lte("data", fimISO),
    supabase
      .from("sincronizacoes_investidor10")
      .select("executado_em, rentabilidade_total, rentabilidade_12m")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ok", true)
      .not("rentabilidade_12m", "is", null)
      .order("executado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("parametros_plano")
      .select("valor")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("chave", "meta_reserva_emergencia")
      .maybeSingle(),
    montarDivisaoDoMes(supabase, `${hoje.slice(0, 7)}-01`),
    lerDecisoes(supabase, trimestre),
    lerDecisoes(supabase, anterior),
  ]);
  for (const r of [posicoes, cotacoes, parcelas, retiradas, sync, metaReserva]) {
    if (r.error) throw new Error(`Balanço: ${r.error.message}`);
  }

  // ---- Ativo: a carteira vem das fotos mensais; o que está fora da corretora
  // (ouro, cofre, conta) só tem o saldo de hoje, repetido nas duas datas.
  const classes = agregarPorClasse(
    ((posicoes.data ?? []) as PosicaoDetalhada[]).filter((p) => Number(p.quantidade_atual) > 0),
    new Map<string, Cotacao>((cotacoes.data ?? []).map((c) => [c.ativo_id, c])),
    new Map(),
  );
  const fora = classes.filter((c) => c.foraDaCorretora).flatMap((c) => c.ativos.map((a) => ({ ...a, classe: c.classe })));
  const notas: Array<{ n?: number; texto: string }> = [];
  const linhasFora: LinhaBalanco[] = fora.map((a) => {
    let conta = a.nome || a.ticker;
    if (a.classe === "ouro") {
      conta = `Ouro, ${a.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g em joias`;
      notas.push({
        n: 1,
        texto: `Avaliação mais recente (${a.precoAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por grama), repetida nas duas datas. Custo de compra: ${reais(a.valorAplicado)}.`,
      });
    }
    return { conta, nota: a.classe === "ouro" ? 1 : 2, inicio: a.valorMercado, fim: a.valorMercado };
  });
  if (linhasFora.some((l) => l.nota === 2)) notas.push({ n: 2, texto: "Saldo atual repetido nas duas datas: o Bank não guarda o histórico dessas posições." });

  const carteiraInicio = d.carteiraInicio ?? d.carteiraFim;
  const ativo: LinhaBalanco[] = [
    { conta: "Investimentos na corretora, a mercado", inicio: carteiraInicio, fim: d.carteiraFim },
    ...linhasFora.sort((a, b) => b.fim - a.fim),
  ];

  // ---- Passivo: principal das parcelas que ainda não estavam pagas em cada data.
  const listaParcelas = parcelas.data ?? [];
  const abertoEm = (iso: string) =>
    listaParcelas
      .filter((p) => !(p.paga && p.paga_em && String(p.paga_em) <= iso))
      .reduce((s, p) => s + Number(p.valor_amortizacao ?? 0), 0);
  const descricaoDivida = (() => {
    const divida = listaParcelas[0]?.divida as unknown as { descricao?: string; debito_automatico?: boolean } | undefined;
    if (!divida) return "Dívidas";
    const nome = (divida.descricao ?? "Empréstimo").replace(/^Empréstimo\s*/i, "");
    return `${divida.debito_automatico ? "Empréstimo consignado" : "Empréstimo"} ${nome}, principal em aberto`.trim();
  })();
  const passivo: LinhaBalanco[] = listaParcelas.length
    ? [{ conta: descricaoDivida, nota: 3, inicio: abertoEm(fimAnteriorISO), fim: abertoEm(fimISO) }]
    : [];
  const jurosFuturos = listaParcelas
    .filter((p) => !(p.paga && p.paga_em && String(p.paga_em) <= fimISO))
    .reduce((s, p) => s + (Number(p.valor_parcela ?? 0) - Number(p.valor_amortizacao ?? 0)), 0);
  if (passivo.length) {
    notas.push({ n: 3, texto: `Só o principal. Os juros futuros do contrato (${reais(jurosFuturos)}) não entram: ainda não são dívida e diminuem quando uma parcela é adiantada.` });
  }
  notas.push({ texto: "Investimentos: foto do fim de cada mês, espelhada do Investidor10." });

  const soma = (l: LinhaBalanco[], k: "inicio" | "fim") => l.reduce((s, x) => s + x[k], 0);
  const totalAtivo = { inicio: soma(ativo, "inicio"), fim: soma(ativo, "fim") };
  const totalPassivo = { inicio: soma(passivo, "inicio"), fim: soma(passivo, "fim") };
  const pl = { inicio: totalAtivo.inicio - totalPassivo.inicio, fim: totalAtivo.fim - totalPassivo.fim };
  const ritmo = (pl.fim - pl.inicio) / 3;
  const mesesAteZero = pl.fim < 0 && ritmo > 0 ? Math.ceil(-pl.fim / ritmo) : null;

  const valorFora = (classe: string) => fora.filter((a) => a.classe === classe).reduce((s, a) => s + a.valorMercado, 0);
  const composicao = [
    { rotulo: "Corretora", valor: d.carteiraFim, cor: "#1f3347" },
    { rotulo: "Ouro", valor: valorFora("ouro"), cor: "#b8925a" },
    { rotulo: "Espécie e conta", valor: valorFora("especie") + valorFora("conta"), cor: "#4c6b50" },
  ].filter((c) => c.valor > 0);

  // ---- O trimestre em números
  const totalRetiradas = (retiradas.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
  const cresceu = d.carteiraInicio != null ? d.carteiraFim - d.carteiraInicio : null;
  const pagasNoTri = listaParcelas.filter((p) => p.paga && p.paga_em && String(p.paga_em) >= inicioISO && String(p.paga_em) <= fimISO);
  const reservaAtual = d.carteira.porFinalidade.find((f) => f.finalidade === "reserva_emergencia")?.valor ?? 0;
  const reuniaoRealizada = d.reuniao != null && d.reuniao.compromissos.length > 0;

  // ---- O que deu certo / o que ajustar: o mesmo balanço do Modo TV, mais o
  // que só faz sentido por escrito (aporte tirado da reserva, reunião).
  const { certos, ajustes } = balancoDoTrimestre(d);
  if (totalRetiradas > 0) {
    ajustes.push({
      emoji: "",
      texto: `${reais(totalRetiradas)} foram resgatados da reserva no trimestre.`,
      proximoPasso: "Aporte que sai da reserva acende a medalha, mas não aumenta o patrimônio. O aporte do mês sai da renda do mês.",
    });
  }
  if (!reuniaoRealizada) {
    ajustes.push({
      emoji: "",
      texto: "O trimestre fechou sem reunião familiar.",
      proximoPasso: `Fazer a reunião do ${siglaDe(proximo)} até o dia 15 do mês seguinte ao fechamento e registrar os compromissos no Modo TV.`,
    });
  }

  // ---- Próximo trimestre
  const mesesProximo = mesesDoTrimestre(proximo);
  const parcelasProximo = listaParcelas.filter((p) => {
    const mes = Number(String(p.data_vencimento).slice(0, 4)) * 100 + Number(String(p.data_vencimento).slice(5, 7));
    return mesesProximo.includes(mes);
  });
  const mesDepois = trimestreVizinho(proximo, 1);
  const primeiroMesDepois = mesesDoTrimestre(mesDepois)[0];
  const dataBalanco = (dia: number) => `${String(dia).padStart(2, "0")}/${String(primeiroMesDepois % 100).padStart(2, "0")}/${Math.floor(primeiroMesDepois / 100)}`;
  const proximoTxt = [
    `Aporte pedido: ${reais(d.proximo.aporteTotal)} no trimestre (${d.proximo.aportePorMes.map((a) => `${MESES[(a.mes % 100) - 1]} ${reais(a.valor)}`).join(" · ")}).`,
    parcelasProximo.length
      ? `Santander: ${parcelasProximo.length} parcelas no trimestre, ${reais(Number(parcelasProximo[0].valor_parcela))} cada.`
      : "",
    mesesProximo.some((m) => m % 100 === 12) ? "13º salário: chega em dezembro. O destino segue a ordem da família: reserva, Santander, renda variável." : "",
    reservaAtual < Number(metaReserva.data?.valor ?? 0)
      ? `Reserva: faltam ${reais(Number(metaReserva.data?.valor) - reservaAtual)} para a meta de ${reais(Number(metaReserva.data?.valor))}.`
      : "Reserva: meta atingida. Dinheiro extra segue para o Santander.",
    `Reunião familiar: até ${dataBalanco(15)}, registrada no Modo TV.`,
    `Próximo balanço: convocação em ${dataBalanco(5)}, cobrança em ${dataBalanco(15)} e balanço em ${dataBalanco(25)}.`,
  ].filter(Boolean);

  const sigla = siglaDe(trimestre);
  const mesHoje = Number(hoje.slice(5, 7));
  const dados: DadosBalanco = {
    trimestre,
    sigla,
    proximaSigla: siglaDe(proximo),
    periodo: `1º de ${MESES[(meses[0] % 100) - 1]} a ${Number(fimISO.slice(8, 10))} de ${MESES[(meses[2] % 100) - 1]} de ${fimISO.slice(0, 4)}`,
    dataInicio: ddmmaaaa(fimAnteriorISO),
    dataFim: ddmmaaaa(fimISO),
    emitidoEm: ddmmaaaa(hoje),
    emitidoPorExtenso: `${Number(hoje.slice(8, 10))} de ${MESES[mesHoje - 1]} de ${hoje.slice(0, 4)}`,
    ativo,
    passivo,
    totalAtivo,
    totalPassivo,
    pl,
    mesesAteZero,
    composicao,
    notas,
    numeros: {
      carteiraCresceu: cresceu,
      carteiraCresceuPct: cresceu != null && d.carteiraInicio ? (cresceu / d.carteiraInicio) * 100 : null,
      retiradas: totalRetiradas,
      cresceuSemRetiradas: cresceu != null ? cresceu + totalRetiradas : null,
      cresceuSemRetiradasPct: cresceu != null && d.carteiraInicio ? ((cresceu + totalRetiradas) / d.carteiraInicio) * 100 : null,
      rentab12M: sync.data?.rentabilidade_12m != null ? Number(sync.data.rentabilidade_12m) : null,
      rentabTotal: sync.data?.rentabilidade_total != null ? Number(sync.data.rentabilidade_total) : null,
      rentabApuradaEm: sync.data ? ddmmaaaa(new Date(sync.data.executado_em).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })) : null,
      aportes: d.aportes.map((a) => ({ rotulo: MESES[(a.mes % 100) - 1], valor: a.realizado != null ? Math.max(0, a.realizado) : null })),
      aportado: d.aportadoTotal,
      planejado: d.planejadoTotal,
      reorganizacao: d.aportes.every((a) => a.reorganizacao),
      parcelasPagas: pagasNoTri.length,
      pagoDivida: pagasNoTri.reduce((s, p) => s + Number(p.valor_pago_efetivo ?? p.valor_parcela ?? 0), 0),
      amortizado: passivo.length ? passivo[0].inicio - passivo[0].fim : 0,
      parcelasRestantes: listaParcelas.filter((p) => !p.paga).length,
      quitacao: d.divida.quitacaoPrevista,
      reserva: reservaAtual,
      metaReserva: Number(metaReserva.data?.valor ?? 0),
      arthur: d.arthur.atual,
      sobra: divisao.pessoas.map((p) => ({ nome: p.nome, valor: p.sobra })),
      sobraTotal: divisao.sobraTotal,
      mesSobra: MESES[mesHoje - 1],
    },
    semanas: {
      lista: d.semanas.lista.map((s) => ({ rotulo: `${s.inicio.slice(8, 10)}/${s.inicio.slice(5, 7)}`, gasto: s.gasto, meta: s.meta })),
      media: d.semanas.media,
      meta: d.semanas.meta,
      dentro: d.semanas.dentro,
      total: d.semanas.total,
    },
    certos,
    ajustes,
    reuniao: { realizada: reuniaoRealizada, compromissos: d.reuniao?.compromissos ?? [] },
    decisoes: estadoDecisoes.perguntas.length
      ? {
          pessoas: estadoDecisoes.pessoas.map((p) => p.nome),
          perguntas: estadoDecisoes.perguntas.map((p) => {
            const respostas = estadoDecisoes.pessoas.map((pessoa) => {
              const i = p.respostas.get(pessoa.id);
              return i == null ? null : (p.opcoes[i] ?? null);
            });
            const dadas = respostas.filter((r): r is string => r != null);
            return { numero: p.numero, texto: p.texto, respostas, divergente: new Set(dadas).size > 1 };
          }),
        }
      : null,
    // Sem reunião no trimestre anterior, o que se confere agora são as
    // decisões que cada um tomou no grupo.
    compromissosAnteriores: d.compromissosAnteriores.length
      ? d.compromissosAnteriores
      : decisoesAnteriores.perguntas.map((p) => ({
          texto: `${p.texto} ${decisoesAnteriores.pessoas
            .map((pessoa) => `${pessoa.nome}: ${p.respostas.has(pessoa.id) ? p.opcoes[p.respostas.get(pessoa.id)!] : "não decidiu"}`)
            .join(" · ")}`,
          cumprido: null,
        })),
    proximo: proximoTxt,
    parecer: [],
  };
  dados.parecer = await parecerGuardado(supabase, dados);
  return dados;
}

/**
 * O parecer é escrito uma vez por trimestre e guardado: "Ver PDF" e "Enviar no
 * grupo" têm que mostrar o mesmo texto (o modelo escreveria outro a cada
 * chamada). O parecer de reserva (API fora do ar) não é guardado, para a
 * próxima geração tentar o modelo de novo.
 */
async function parecerGuardado(supabase: SupabaseClient, dados: DadosBalanco): Promise<string[]> {
  const { data, error } = await supabase
    .from("balancos_trimestrais")
    .select("parecer")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("trimestre", dados.trimestre)
    .maybeSingle();
  if (error) throw new Error(`Balanço: ${error.message}`);
  if (Array.isArray(data?.parecer) && data.parecer.length > 0) return data.parecer as string[];

  const { paragrafos, doModelo } = await escreverParecer(dados);
  if (doModelo) {
    await supabase
      .from("balancos_trimestrais")
      .upsert({ entidade_id: ENTIDADE_FAMILIA, trimestre: dados.trimestre, parecer: paragrafos }, { onConflict: "entidade_id,trimestre" });
  }
  return paragrafos;
}

// ---------- Parecer do Arkad ----------

const SCHEMA_PARECER = {
  type: "object",
  properties: { paragrafos: { type: "array", items: { type: "string" } } },
  required: ["paragrafos"],
  additionalProperties: false,
} as const;

const PERSONA_PARECER = `Você é o Arkad, conselheiro financeiro da Casa Andrade Muller — Arlison e Franciele, pais do Arthur. Você escreve o PARECER que fecha o Balanço Patrimonial Trimestral da família, um documento em PDF que vai para o grupo deles.

Português do Brasil, frases curtas, tom firme e caloroso de quem acompanha a família de perto. Escreva como um conselheiro que assina um documento, não como chat: sem emoji, sem markdown, sem listas.

FORMA: 3 ou 4 parágrafos. O primeiro é só "Família,". O último é uma frase curta de despedida que aponta para o próximo balanço (ex.: "Nos vemos no balanço do 4T26."). No meio: o que os números dizem sobre a direção da casa (o longo prazo primeiro), o que preocupa e por quê, e o que o próximo trimestre pede.

REGRAS:
- Todo número que você citar tem que estar nos DADOS. Prefira poucos números, arredondados por extenso ("quase seis mil reais").
- A mensagem é sempre de longo prazo: mesmo num trimestre ruim, o parecer termina com direção, não com sentença.
- Se a reunião familiar não aconteceu, diga com clareza que isso é o que mais preocupa: decisão que não é tomada à mesa acaba sendo tomada pelo mês.
- Ligue o ponto fraco do trimestre a uma das curas do livro, parafraseando (nunca cite trecho literal).
- Não recomende investimento específico.
${DOUTRINA_ARKAD}`;

async function escreverParecer(dados: DadosBalanco): Promise<{ paragrafos: string[]; doModelo: boolean }> {
  try {
    const anthropic = new Anthropic();
    const resposta = await anthropic.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_PARECER } },
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      system: PERSONA_PARECER,
      messages: [
        {
          role: "user",
          content: `DADOS DO BALANÇO ${dados.sigla} (única fonte de números):\n${JSON.stringify({ ...dados, parecer: undefined }, null, 2)}\n\nEscreva o parecer.`,
        },
      ],
    });
    const bloco = resposta.content.find((b) => b.type === "text");
    if (resposta.stop_reason !== "refusal" && bloco && bloco.type === "text") {
      const { paragrafos } = JSON.parse(bloco.text) as { paragrafos: string[] };
      const limpos = paragrafos.map((p) => p.trim()).filter(Boolean);
      if (limpos.length >= 2) return { paragrafos: limpos, doModelo: true };
    }
  } catch (erro) {
    console.error("[balanco] parecer", erro);
  }
  return { paragrafos: parecerPadrao(dados), doModelo: false };
}

/** Se a API falhar, o balanço sai mesmo assim — com um parecer montado dos números. */
function parecerPadrao(d: DadosBalanco): string[] {
  const variacao = d.pl.fim - d.pl.inicio;
  return [
    "Família,",
    variacao >= 0
      ? `O patrimônio líquido da casa melhorou ${reais(variacao)} neste trimestre. A dívida diminui todo mês e a direção é a certa: cada trimestre assim aproxima vocês do dia em que a casa passa a ter mais do que deve.`
      : `O patrimônio líquido da casa recuou ${reais(-variacao)} neste trimestre. Um trimestre não define o caminho; o que define é o que vocês decidem a partir dele.`,
    d.reuniao.realizada
      ? "Vocês se sentaram e decidiram juntos. É isso que transforma número em direção: confiram os compromissos abaixo ao longo do trimestre."
      : "O que mais me preocupa não está nos números: o trimestre fechou sem reunião. Decisão que não é tomada à mesa acaba sendo tomada pelo próprio mês, e o mês sempre escolhe gastar.",
    `Nos vemos no balanço do ${d.proximaSigla}.`,
  ];
}
