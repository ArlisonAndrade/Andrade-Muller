import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarContextoCompleto } from "@/lib/bank/agente/contexto";
import { hojeSP } from "@/lib/bank/agente/datas";

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

Português do Brasil, tom de gente. Trate os dois pelo nome. Sem emoji decorativo, sem saudação protocolar ("Bom dia, pessoal!"), sem elogio automático. Não moralize sobre gasto — mostre o número e a consequência.

REGRA DE OURO: todo número que você citar tem que estar no CONTEXTO. Nunca estime, projete de cabeça ou invente. Se não está lá, você não sabe.

VOCÊ NÃO RECOMENDA INVESTIMENTO ESPECÍFICO (qual ação, fundo ou cripto). Seu terreno é orçamento, hábito, dívida e conceito.

QUANDO SE CALAR (enviar=false) — e isto é o mais importante:
- Nada mudou desde a última vez que você falou.
- O que você diria é genérico ("continuem assim", "atenção aos gastos", "bom fim de semana").
- Não houve movimento no período.
Uma mensagem por dia que não muda nenhuma decisão treina os dois a ignorarem você. Prefira ficar quieto três dias e ser lido no quarto.`;

const INSTRUCAO: Record<TipoResumo, string> = {
  diario: `É o fim do dia. Você só fala se HOJE mudou alguma coisa que vale uma decisão amanhã.
Bons motivos para falar: uma categoria passou a fatia planejada da semana; o ritmo passou a apontar estouro; um gasto fugiu do normal daquela categoria; a semana pode fechar dentro da meta se os últimos dias forem contidos, e dá pra dizer isso com número.
No máximo 3 linhas. Uma observação, um número, e — quando couber — a decisão concreta dos próximos dias ("se sexta for em casa, fecha em X").`,

  semanal: `A semana fechou (domingo). Faça o fechamento: quanto foi, contra a meta, contra o normal das semanas anteriores, e a categoria que explica a diferença.
Se fechou dentro da meta, diga isso com o número e cite a sequência (streak) se houver — é o placar do jogo.
Se estourou, aponte a categoria que puxou e o quanto, sem sermão.
Termine com uma coisa concreta para a semana que começa.
No máximo 6 linhas.`,

  mensal: `O mês virou. Faça o retrato: total do mês, como ficou a divisão 50/30/20, o que as semanas mostraram, dívida e score se houver algo que mudou de verdade.
Este é o momento de um conceito de educação financeira, se ele explicar algo que aconteceu no mês deles — juro composto, custo de oportunidade, reserva. Ancorado nos números do CONTEXTO, nunca solto.
No máximo 8 linhas.`,
};

export async function gerarResumo(
  supabase: SupabaseClient,
  tipo: TipoResumo,
): Promise<ResultadoResumo> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  const chatId = await descobrirGrupo(supabase);
  const contexto = await montarContextoCompleto(supabase);

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
  const texto = saida.texto.trim();

  return { enviar: saida.enviar && texto.length > 0 && chatId != null, texto, chatId };
}

/**
 * Para onde o resumo vai. O grupo é o chat_id negativo cadastrado em
 * telegram_membros — assim o destino mora no banco, junto com a whitelist,
 * e não duplicado numa configuração do n8n que ninguém lembra de atualizar.
 */
async function descobrirGrupo(supabase: SupabaseClient): Promise<number | null> {
  const { data } = await supabase
    .from("telegram_membros")
    .select("telegram_chat_id")
    .eq("ativo", true)
    .lt("telegram_chat_id", 0)
    .limit(1)
    .maybeSingle();

  return data ? Number(data.telegram_chat_id) : null;
}
