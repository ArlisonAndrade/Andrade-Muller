import Anthropic from "@anthropic-ai/sdk";
import { moedaBRL } from "@/lib/bank/formato";
import type { ContextoAgente, Interpretacao } from "@/lib/bank/agente/tipos";

// Interpretação da mensagem do grupo pela Claude API, com structured outputs
// (mesmo padrão de lib/acoes/analise.ts). Nada de regex: "paguei 89 e pouco no
// mercado com o nubank ontem" só vira lançamento correto com o modelo vendo a
// lista real de categorias e cartões da família.
//
// O modelo NÃO monta a confirmação com valores — ele devolve intenção + uma
// frase de consultoria. Os números do "✅" e do status da semana são montados
// depois, em executar.ts, direto do banco. É isso que impede o bot de
// "alucinar" um saldo.

const SCHEMA_INTERPRETACAO = {
  type: "object",
  properties: {
    acao: {
      type: "string",
      enum: ["lancar", "responder", "ignorar"],
      description:
        "lancar = a mensagem informa um ou mais gastos com valor; " +
        "responder = pergunta, pedido de status, ou gasto sem valor claro; " +
        "ignorar = conversa entre o casal que não pede nada ao consultor",
    },
    lancamentos: {
      type: "array",
      description: "Vazio quando acao != 'lancar'. Uma entrada por gasto citado.",
      items: {
        type: "object",
        properties: {
          descricao: {
            type: "string",
            description: "Curta, como apareceria no extrato. Ex.: 'Mercado', 'Posto Shell'",
          },
          valor: { type: "number", description: "Sempre positivo, em reais" },
          categoria_id: {
            anyOf: [
              { type: "string", description: "id vindo da lista de categorias do contexto" },
              { type: "null" },
            ],
          },
          forma_pagamento: {
            anyOf: [
              { type: "string", enum: ["debito", "credito", "pix", "dinheiro", "outro"] },
              { type: "null" },
            ],
          },
          cartao_id: {
            anyOf: [
              { type: "string", description: "id da lista de cartões; só com forma_pagamento='credito'" },
              { type: "null" },
            ],
          },
          data: { type: "string", description: "AAAA-MM-DD" },
          confianca: {
            type: "string",
            enum: ["alta", "baixa"],
            description: "baixa quando a categoria foi chute ou o valor ficou ambíguo",
          },
        },
        required: [
          "descricao",
          "valor",
          "categoria_id",
          "forma_pagamento",
          "cartao_id",
          "data",
          "confianca",
        ],
        additionalProperties: false,
      },
    },
    resposta: {
      type: "string",
      description:
        "Com acao='responder', a resposta completa ao que foi perguntado. " +
        "Com acao='lancar', UMA frase curta de consultoria (ou vazio). " +
        "Com acao='ignorar', vazio.",
    },
  },
  required: ["acao", "lancamentos", "resposta"],
  additionalProperties: false,
} as const;

const SISTEMA = `Você é o consultor financeiro da família Andrade Muller — Arlison e Franciele — dentro do grupo deles no Telegram. Eles têm um filho, o Arthur. Você acompanha o orçamento da família todos os dias: registra os gastos que eles mandam, responde dúvidas e ensina educação financeira no meio da conversa, como faria um consultor de confiança que já conhece a vida financeira deles.

COMO VOCÊ DECIDE O QUE FAZER
- "lancar": a mensagem informa um gasto com valor. Pode ter mais de um ("mercado 230 e gasolina 100" = dois lançamentos).
- "responder": pergunta, pedido de status, dúvida conceitual, ou um gasto citado sem valor claro (aí você pergunta o valor).
- "ignorar": conversa entre eles que não pede nada de você. Prefira ignorar a interromper.

REGRAS DE LANÇAMENTO
- categoria_id tem que ser um id da lista de categorias do CONTEXTO. Se nada encaixar, use a categoria "Outros" e marque confianca "baixa".
- Marque confianca "baixa" também quando o valor ou a data ficaram ambíguos. O lançamento é feito mesmo assim — quem revisa é a família.
- data: use a data de hoje do CONTEXTO por padrão. "ontem", "sexta", "dia 12" viram datas absolutas calculadas a partir dela. Nunca lance data futura.
- cartao_id só quando forma_pagamento for "credito", e só com um id da lista de cartões. Menções como "nubank", "carrefour", "meu cartão" mapeiam para o cartão certo.
- Sem menção de forma de pagamento, deixe forma_pagamento e cartao_id nulos — não invente.

REGRAS DE CONVERSA
- A meta da semana cobre só o gasto que se decide na semana — mercado, food, jantar, farmácia, presente, combustível. Conta fixa, fatura, parcela de compra antiga e aporte NÃO entram (são as categorias com entra_na_meta_da_semana=false). Se lançarem uma dessas, confirme normalmente e não trate como "estourou a meta": esse dinheiro já estava decidido.
- Todo número que você citar tem que estar no CONTEXTO. Você não tem acesso a mais nada: nunca estime, projete de cabeça ou invente saldo, total ou percentual. Se a informação não está lá, diga que não tem esse dado ainda.
- Com acao="lancar", a "resposta" é UMA frase curta: um padrão que você notou, uma dica prática, um conceito em uma linha. O app já escreve sozinho o valor confirmado e o status da semana — não repita nenhum dos dois. Se não tiver nada útil a dizer, devolva string vazia. Silêncio é melhor que enrolação diária.
- Com acao="responder", responda de verdade a pergunta: direto, em uma ou duas frases quando der, mais longo só quando a pergunta pedir explicação.
- Educação financeira é bem-vinda: juro composto, reserva de emergência, custo de oportunidade, como funciona um índice. Explique com os números do CONTEXTO quando eles ilustrarem o ponto.
- Você NÃO recomenda investimento específico (qual ação, fundo ou cripto comprar) nem opina se devem comprar ou vender um ativo. Seu terreno é orçamento, hábito, dívida e conceito. Se pedirem indicação de ativo, diga isso em uma frase e ofereça o que você pode fazer.
- Português do Brasil, tom de gente. Trate os dois pelo nome. Sem emoji decorativo, sem elogio automático, sem "ótima pergunta". Não moralize sobre gasto — mostre o número e a consequência.`;

export async function interpretarMensagem(
  contexto: ContextoAgente,
  texto: string,
  autor: string,
): Promise<Interpretacao> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada — o agente do Telegram precisa dela.");
  }

  const anthropic = new Anthropic();

  const resumoContexto = {
    hoje: contexto.hoje,
    quem_falou: autor,
    categorias: contexto.categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      grupo: c.grupo_orcamento,
      tipo: c.tipo,
      entra_na_meta_da_semana: c.conta_na_semana,
    })),
    cartoes: contexto.cartoes.map((c) => ({ id: c.id, nome: c.nome, titular: c.titular })),
    semana_atual: {
      de: contexto.semana.inicio,
      ate: contexto.semana.fim,
      meta: contexto.semana.meta != null ? moedaBRL(contexto.semana.meta) : "sem meta definida",
      ja_gasto: moedaBRL(contexto.semana.gasto),
      dias_restantes: contexto.semana.diasRestantes,
    },
    mes_atual: {
      desde: contexto.mes.inicio,
      total_gasto: moedaBRL(contexto.mes.gasto),
      essencial_50: moedaBRL(contexto.mes.porGrupo.essencial_50),
      liberdade_30: moedaBRL(contexto.mes.porGrupo.liberdade_30),
      investimento_20: moedaBRL(contexto.mes.porGrupo.investimento_20),
    },
    ultimos_lancamentos: contexto.ultimos.map((t) => ({
      data: t.data,
      descricao: t.descricao,
      valor: moedaBRL(t.valor),
      categoria: t.categoria,
    })),
  };

  const response = await anthropic.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    // Extração + uma frase de consultoria: tarefa curta, não precisa de
    // raciocínio profundo, e no Telegram a latência é o que se percebe.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: SCHEMA_INTERPRETACAO },
    },
    // Se um classificador de segurança recusar uma mensagem qualquer do
    // grupo, a API refaz na Opus 4.8 em vez de o bot ficar mudo.
    betas: ["server-side-fallback-2026-06-01"],
    fallbacks: [{ model: "claude-opus-4-8" }],
    system: SISTEMA,
    messages: [
      {
        role: "user",
        content: `CONTEXTO (única fonte de números):\n${JSON.stringify(resumoContexto, null, 2)}\n\nMENSAGEM DE ${autor.toUpperCase()}:\n${texto}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("A mensagem foi recusada pelo modelo.");
  }

  const bloco = response.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") {
    throw new Error("O agente não devolveu conteúdo.");
  }
  return JSON.parse(bloco.text) as Interpretacao;
}
