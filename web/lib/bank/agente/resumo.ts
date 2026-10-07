import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exigirLeituras, montarContextoCompleto } from "@/lib/bank/agente/contexto";
import { hojeSP } from "@/lib/bank/agente/datas";
import { baixarParcelasAutomaticas } from "@/lib/bank/dividas-automaticas";
import { anunciarConquistasNovas } from "@/lib/bank/conquistas";
import { anunciarAportesNovos } from "@/lib/bank/aporte-anuncio";
import { DOUTRINA_ARKAD } from "@/lib/bank/agente/arkad";
import { linhaVitoria } from "@/lib/bank/agente/marcos";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { aporteDoMes, lerParametros, rotuloMes, somarMeses } from "@/lib/bank/plano";
import { aporteRealizado, movimentosPorMes } from "@/lib/bank/aporte";

// Camada proativa: o consultor fala sem ninguém perguntar. É o que separa um
// bot de lançamento de um consultor de verdade — mas é também o jeito mais
// rápido de virar ruído ignorado. Por isso o modelo pode se calar, e a
// instrução mais forte do prompt é justamente essa.

export type TipoResumo = "diario" | "semanal" | "mensal";

export type ResultadoResumo = {
  enviar: boolean;
  texto: string;
  chatId: number | null;
};

const SCHEMA = {
  type: "object",
  properties: {
    enviar: {
      type: "boolean",
      description:
        "false quando não há nada que mude uma decisão hoje. Silêncio é a resposta padrão.",
    },
    texto: {
      type: "string",
      description: "A mensagem para o grupo. Vazia quando enviar=false.",
    },
  },
  required: ["enviar", "texto"],
  additionalProperties: false,
} as const;

const PERSONA = `Você é o consultor financeiro da família Andrade Muller — Arlison e Franciele, pais do Arthur — no grupo deles no Telegram. Você acompanha o orçamento todos os dias e conhece os números deles.

Português do Brasil, tom de gente. Fale com os dois juntos, de forma informal e com um toque da Babilônia de Arkad: abra com "Família," ou varie com "Casa Andrade Muller," ou "Meus aprendizes," — nunca "Arlison, Franciele:" (decisão do Arlison, 01/out/2026). O nome de um dos dois só aparece quando a frase é sobre o que aquela pessoa fez. Sem emoji decorativo, sem saudação protocolar ("Bom dia, pessoal!"), sem elogio automático. Não moralize sobre gasto — mostre o número e a consequência.

REGRA DE OURO: todo número que você citar tem que estar no CONTEXTO. Nunca estime, projete de cabeça ou invente. Se não está lá, você não sabe.

VOCÊ NÃO RECOMENDA INVESTIMENTO ESPECÍFICO (qual ação, fundo ou cripto). Seu terreno é orçamento, hábito, dívida e conceito.

QUANDO SE CALAR (enviar=false) — e isto é o mais importante:
- Nada mudou desde a última vez que você falou.
- O que você diria é genérico ("continuem assim", "atenção aos gastos", "bom fim de semana").
- Não houve movimento no período.
Uma mensagem por dia que não muda nenhuma decisão treina os dois a ignorarem você. Prefira ficar quieto três dias e ser lido no quarto.
${DOUTRINA_ARKAD}`;

const INSTRUCAO: Record<TipoResumo, string> = {
  diario: `É o fim do dia. Você só fala se HOJE mudou alguma coisa que vale uma decisão amanhã.
Bons motivos para falar: uma categoria passou a fatia planejada da semana; o ritmo passou a apontar estouro; um gasto fugiu do normal daquela categoria; a semana pode fechar dentro da meta se os últimos dias forem contidos, e dá pra dizer isso com número.
No máximo 3 linhas. Uma observação, um número, e — quando couber — a decisão concreta dos próximos dias ("se sexta for em casa, fecha em X").`,

  semanal: `A semana fechou (domingo). Faça o fechamento: quanto foi, contra a meta, contra o normal das semanas anteriores, e a categoria que explica a diferença.
Se fechou dentro da meta, diga isso com o número e cite a sequência (streak) se houver — é o placar do jogo. Comemore de verdade, e ligue a vitória a um princípio da Babilônia com uma analogia que caiba NESTA semana (o app já põe o troféu na primeira linha; não repita "parabéns" nem o emoji).
Se estourou, aponte a categoria que puxou e o quanto, sem sermão.
Termine com uma coisa concreta para a semana que começa.
No máximo 6 linhas.`,

  mensal: `O mês virou. Faça o retrato do MÊS QUE FECHOU (bloco mesFechado do CONTEXTO): o que as semanas mostraram, dívida e score se houver algo que mudou de verdade.
SEMPRE inclua quanto a carteira de investimentos cresceu no mês fechado (mesFechado.carteira.cresceuSemRetiradas e .percentual) — esse número já soma de volta as retiradas, que não descontam (foram manobra da reserva); não fale em "retirada" como perda. Separe o que foi aporte do que foi rendimento do mercado.
O aporte do mês se avalia pelo mesFechado.aporte (é o do mês que acabou), NUNCA pelo pilar "Aporte" do score: o score é do mês que acabou de começar e no dia 1 está naturalmente zerado — não chame isso de buraco. Se mesFechado.aporte.reorganizacao for true, o mês ainda não contava no placar (reorganização): reconheça o que foi feito, sem cobrar meta.
Se mesFechado.fechaTrimestre existir, o mês fechou um trimestre: dê o crescimento da carteira no trimestre (mesFechado.fechaTrimestre.carteira) e TERMINE lembrando da reunião trimestral de fechamento do trimestre em mesFechado.fechaTrimestre.rotulo — é hora de marcar o dia dos dois sentarem com o Modo TV.
Este é o momento de um conceito de educação financeira, se ele explicar algo que aconteceu no mês deles — juro composto, custo de oportunidade, reserva. Ancorado nos números do CONTEXTO, nunca solto.
No máximo 10 linhas.`,
};

export async function gerarResumo(
  supabase: SupabaseClient,
  tipo: TipoResumo,
): Promise<ResultadoResumo> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  const chatId = await descobrirGrupo(supabase);
  // O resumo pode rodar num dia 2 antes de alguém abrir o site: sem a baixa, o
  // consultor leria a parcela do consignado como atrasada.
  await baixarParcelasAutomaticas(supabase);

  const base = await resumoDoModelo(supabase, tipo, chatId);
  if (chatId == null) return base;

  // Medalha nova é anunciada no grupo (decisão do Arlison, 14/set/2026) — é
  // fato, não opinião do modelo, então vai mesmo quando ele decidiu calar.
  // Marca como anunciada só depois de o texto do modelo já existir: se a
  // chamada à API falhasse antes, a medalha ficaria marcada sem ter saído.
  // Aporte novo vem antes da medalha: ela é consequência dele.
  const anuncios = [
    await anunciarAportesNovos(supabase),
    await anunciarConquistasNovas(supabase),
  ].filter(Boolean);
  if (anuncios.length === 0) return base;
  if (base.enviar) anuncios.push(base.texto);
  return { enviar: true, texto: anuncios.join("\n\n"), chatId };
}

async function resumoDoModelo(
  supabase: SupabaseClient,
  tipo: TipoResumo,
  chatId: number | null,
): Promise<ResultadoResumo> {
  const contexto = {
    ...(await montarContextoCompleto(supabase)),
    ...(tipo === "mensal" ? { mesFechado: await montarMesFechado(supabase) } : {}),
  };

  // Sem nenhum gasto na semana não há retrato a fazer — evita queimar uma
  // chamada de API para o modelo concluir que não tem o que dizer.
  if (tipo === "diario" && contexto.semana.gasto === 0) {
    return { enviar: false, texto: "", chatId };
  }

  const anthropic = new Anthropic();
  const resposta = await anthropic.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCHEMA },
    },
    betas: ["server-side-fallback-2026-06-01"],
    fallbacks: [{ model: "claude-opus-4-8" }],
    system: PERSONA,
    messages: [
      {
        role: "user",
        content:
          `Hoje é ${hojeSP()}.\n\n` +
          `CONTEXTO (única fonte de números):\n${JSON.stringify(contexto, null, 2)}\n\n` +
          `TAREFA:\n${INSTRUCAO[tipo]}`,
      },
    ],
  });

  if (resposta.stop_reason === "refusal") {
    return { enviar: false, texto: "", chatId };
  }

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") return { enviar: false, texto: "", chatId };

  const saida = JSON.parse(bloco.text) as { enviar: boolean; texto: string };
  let texto = saida.texto.trim();

  // Vitória é fato, não opinião do modelo: se a semana fechou dentro da meta,
  // a linha vai — inclusive quando o modelo decidiu que não tinha o que dizer.
  // Fechar dentro é justamente o dia em que calar seria o erro.
  const { meta, gasto, inicio } = contexto.semana;
  const venceu = tipo === "semanal" && meta != null && meta > 0 && gasto <= meta;
  if (venceu) {
    const vitoria = linhaVitoria(inicio);
    texto = texto ? `${vitoria}\n\n${texto}` : vitoria;
  }

  return {
    enviar: (saida.enviar || venceu) && texto.length > 0 && chatId != null,
    texto,
    chatId,
  };
}

/**
 * Para onde o resumo vai. O grupo é o chat_id negativo cadastrado em
 * telegram_membros — assim o destino mora no banco, junto com a whitelist,
 * e não duplicado numa configuração do n8n que ninguém lembra de atualizar.
 */
async function descobrirGrupo(supabase: SupabaseClient): Promise<number | null> {
  const { data, error } = await supabase
    .from("telegram_membros")
    .select("telegram_chat_id")
    .eq("ativo", true)
    .lt("telegram_chat_id", 0)
    .limit(1)
    .maybeSingle();
  exigirLeituras(error);

  return data ? Number(data.telegram_chat_id) : null;
}

/**
 * O mês que acabou de fechar, pro resumo do dia 1 (pedido do Arlison,
 * 01/out/2026): o score fala do mês que começou — zerado no dia 1 — e o
 * resumo cobrava "aporte 0" de outubro em vez de fechar setembro.
 *
 * Aporte = regra única de lib/bank/aporte.ts (informado → entradas do mês →
 * crescimento do aplicado). Crescimento da carteira SEM as retiradas: retirada
 * não desconta (set/2026 foi a manobra da reserva), então soma-se de volta o
 * que saiu. Rendimento = o que o mercado fez além do que entrou/saiu.
 */
async function montarMesFechado(supabase: SupabaseClient) {
  const hoje = hojeSP();
  const mesAtual = Number(hoje.slice(0, 4)) * 100 + Number(hoje.slice(5, 7));
  const mes = somarMeses(mesAtual, -1);
  const iso = (m: number) => `${Math.floor(m / 100)}-${String(m % 100).padStart(2, "0")}-01`;

  const [{ data: fotos, error: e1 }, { data: informado, error: e2 }, { data: params, error: e3 }, movimentos] = await Promise.all([
    supabase
      .from("snapshots_patrimonio")
      .select("competencia, valor_aplicado, valor_mercado")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .gte("competencia", iso(somarMeses(mes, -3)))
      .lte("competencia", iso(mes)),
    supabase.from("aportes_mensais").select("valor").eq("entidade_id", ENTIDADE_FAMILIA).eq("mes", iso(mes)).maybeSingle(),
    supabase.from("parametros_plano").select("chave, valor").eq("entidade_id", ENTIDADE_FAMILIA),
    movimentosPorMes(supabase, somarMeses(mes, -2)),
  ]);
  exigirLeituras(e1, e2, e3);

  const foto = (m: number) => (fotos ?? []).find((f) => String(f.competencia).slice(0, 7) === iso(m).slice(0, 7));
  const r2 = (v: number) => Math.round(v * 100) / 100;
  /** Variação de `de` (foto do fim do mês anterior ao período) até `ate`. */
  const variacao = (de: number, ate: number) => {
    const a = foto(de);
    const b = foto(ate);
    if (!a || !b) return null;
    let retiradas = 0;
    for (let m = somarMeses(de, 1); m <= ate; m = somarMeses(m, 1)) retiradas += movimentos.get(m)?.retiradas ?? 0;
    const mercado = Number(b.valor_mercado) - Number(a.valor_mercado);
    const aplicado = Number(b.valor_aplicado) - Number(a.valor_aplicado);
    const cresceu = mercado + retiradas; // retirada não desconta
    return {
      inicio: Number(a.valor_mercado),
      fim: Number(b.valor_mercado),
      cresceuSemRetiradas: r2(cresceu),
      percentual: Number(a.valor_mercado) > 0 ? Math.round((cresceu / Number(a.valor_mercado)) * 10000) / 100 : null,
      retiradasDevolvidas: r2(retiradas),
      rendimentoDoMercado: r2(mercado - aplicado),
    };
  };

  const p = lerParametros(params);
  const carteira = variacao(somarMeses(mes, -1), mes);
  const aporte = aporteRealizado({
    mes,
    informado: informado ? Number(informado.valor) : null,
    movimentos: movimentos.get(mes),
    aplicadoMes: foto(mes) ? Number(foto(mes)!.valor_aplicado) : null,
    aplicadoAnterior: foto(somarMeses(mes, -1)) ? Number(foto(somarMeses(mes, -1))!.valor_aplicado) : null,
  });
  const fechaTri = mes % 100 % 3 === 0;

  return {
    mes: rotuloMes(mes),
    carteira,
    aporte: {
      realizado: aporte == null ? null : Math.max(0, r2(aporte)),
      origem: informado ? "informado pela família (saiu da reserva)" : "entradas no Investidor10 (retirada não desconta)",
      planejado: r2(aporteDoMes(p, Math.max(mes, p.inicio))),
      reorganizacao: mes < p.inicioPlacar,
    },
    fechaTrimestre: fechaTri
      ? {
          rotulo: `${Math.ceil((mes % 100) / 3)}º trimestre de ${Math.floor(mes / 100)}`,
          carteira: variacao(somarMeses(mes, -3), mes),
        }
      : null,
  };
}
