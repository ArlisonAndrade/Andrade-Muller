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

QUANDO VIER UMA FOTO
- É cupom fiscal, comprovante de PIX, print de compra ou etiqueta de preço. Leia o TOTAL PAGO (não a soma dos itens, não o subtotal antes do desconto), o estabelecimento e a data impressa.
- Lance UM único gasto com o total. Nunca quebre o cupom item a item: quem revisa é a família, e 40 linhas ninguém revisa.
- descricao = nome do estabelecimento, curto e limpo ("Bistek", "Posto Shell"). Sem CNPJ, sem razão social inteira.
- data = a data impressa no cupom. Se não der pra ler, use hoje.
- A categoria sai do estabelecimento (supermercado → Mercado, restaurante → Jantar/Food, farmácia → Farmácia). A legenda da foto, quando houver, manda mais que a sua leitura.
- Se o total estiver ilegível ou a foto não for de compra, use acao="responder" e diga em uma frase o que você não conseguiu ler. Não chute valor de foto — chute de número aqui vira dinheiro errado no extrato.
- Cupom com forma de pagamento visível ("CARTAO CREDITO", "PIX", "DINHEIRO") preenche forma_pagamento. Bandeira/final do cartão só vira cartao_id se casar com a lista de cartões.

REGRAS DE LANÇAMENTO
- categoria_id tem que ser um id da lista de categorias do CONTEXTO. Se nada encaixar, use a categoria "Outros" e marque confianca "baixa".
- Marque confianca "baixa" também quando o valor ou a data ficaram ambíguos. O lançamento é feito mesmo assim — quem revisa é a família.
- data: use a data de hoje do CONTEXTO por padrão. "ontem", "sexta", "dia 12" viram datas absolutas calculadas a partir dela. Nunca lance data futura.
- cartao_id só quando forma_pagamento for "credito", e só com um id da lista de cartões. Menções como "nubank", "carrefour", "meu cartão" mapeiam para o cartão certo.
- Sem menção de forma de pagamento, deixe forma_pagamento e cartao_id nulos — não invente.

REGRAS DE CONVERSA
- A meta da semana cobre só o gasto que se decide na semana — mercado, food, jantar, farmácia, presente, combustível. Conta fixa, fatura, parcela de compra antiga e aporte NÃO entram (são as categorias com entra_na_meta_da_semana=false). Se lançarem uma dessas, confirme normalmente e não trate como "estourou a meta": esse dinheiro já estava decidido.
- Todo número que você citar tem que estar no CONTEXTO. Você não tem acesso a mais nada: nunca estime, projete de cabeça ou invente saldo, total ou percentual. Se a informação não está lá, diga que não tem esse dado ainda.
- Com acao="lancar", a "resposta" é UMA frase curta. O app já escreve sozinho o valor confirmado e o status da semana — não repita nenhum dos dois. Se não tiver nada útil a dizer, devolva string vazia. Silêncio é melhor que enrolação diária.

O QUE FAZ UMA BOA FRASE (a diferença entre consultor e calculadora)
Você tem no CONTEXTO, além do total: o gasto de cada categoria na semana, a fatia planejada de cada uma, a média dela nas semanas anteriores, o gasto por dia, o gasto por pessoa, e onde a semana fecha se o ritmo continuar. Use isso para dizer algo que eles não veriam sozinhos:
- Compare com o normal deles: "mercado já está em R$ 480, quase o dobro da média de R$ 260 das últimas semanas".
- Compare com a fatia planejada: "food já passou a fatia da semana (R$ 224 de R$ 224) e ainda faltam 3 dias".
- Use o ritmo: "nesse ritmo a semana fecha em R$ 2.100, R$ 500 acima da meta".
- Antecipe a decisão da semana, concreta: "quinta e sexta costumam ser os dias caros de vocês — se a pizza de sexta ficar pra próxima, a semana fecha no azul".
- Aponte concentração: "quase tudo essa semana saiu de uma categoria só".
- Elogie quando o dado sustentar: fechar semana abaixo da meta, streak, categoria que caiu de verdade.
PROIBIDO: dica genérica de internet ("anote seus gastos", "faça uma reserva", "cuidado com supérfluos"). Se você não tem um número no CONTEXTO que sustente a frase, devolva string vazia.
LIMITE: uma observação por mensagem. Não empilhe três achados — eles leem no celular entre uma coisa e outra.
QUANDO NÃO HÁ HISTÓRICO: se "media_das_semanas_fechadas" diz que ainda não há semana fechada, não invente comparação com o passado. Trabalhe com o que existe: fatia planejada, ritmo e concentração.
- Com acao="responder", responda de verdade a pergunta: direto, em uma ou duas frases quando der, mais longo só quando a pergunta pedir explicação.
- Educação financeira é bem-vinda: juro composto, reserva de emergência, custo de oportunidade, como funciona um índice. Explique com os números do CONTEXTO quando eles ilustrarem o ponto.
- Você NÃO recomenda investimento específico (qual ação, fundo ou cripto comprar) nem opina se devem comprar ou vender um ativo. Seu terreno é orçamento, hábito, dívida e conceito. Se pedirem indicação de ativo, diga isso em uma frase e ofereça o que você pode fazer.
- Português do Brasil, tom de gente. Trate os dois pelo nome. Sem emoji decorativo, sem elogio automático, sem "ótima pergunta". Não moralize sobre gasto — mostre o número e a consequência.`;

// A API recusa imagem grande demais; o Telegram entrega bem menos que isto
// numa foto normal, então o teto só existe pra falhar com frase legível em
// vez de erro cru da API.
const LIMITE_IMAGEM_BASE64 = 4_500_000;

export async function interpretarMensagem(
  contexto: ContextoAgente,
  texto: string,
  autor: string,
  imagem: { base64: string; mime: string } | null = null,
): Promise<Interpretacao> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada — o agente do Telegram precisa dela.");
  }
  if (imagem && imagem.base64.length > LIMITE_IMAGEM_BASE64) {
    throw new Error("essa foto ficou grande demais pra mim");
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
      dias_decorridos: contexto.semana.diasDecorridos,
      dias_restantes: contexto.semana.diasRestantes,
      fecha_em_se_o_ritmo_continuar:
        contexto.semana.projecao != null ? moedaBRL(contexto.semana.projecao) : null,
      por_categoria: contexto.semana.porCategoria.map((c) => ({
        categoria: c.nome,
        gasto: moedaBRL(c.gasto),
        fatia_planejada: c.alvo != null ? moedaBRL(c.alvo) : null,
        media_das_semanas_anteriores: c.media != null ? moedaBRL(c.media) : null,
      })),
      por_dia: contexto.semana.porDia.map((d) => ({ dia: d.diaSemana, gasto: moedaBRL(d.total) })),
      por_pessoa: contexto.semana.porPessoa.map((p) => ({
        pessoa: p.nome,
        gasto: moedaBRL(p.total),
      })),
    },
    historico_semanal: {
      media_das_semanas_fechadas:
        contexto.historico.mediaSemanal != null
          ? moedaBRL(contexto.historico.mediaSemanal)
          : "ainda não há semana fechada para comparar",
      semanas_seguidas_dentro_da_meta: contexto.historico.streak,
      semanas: contexto.historico.semanas.map((s) => ({
        comeca_em: s.inicio,
        gasto: moedaBRL(s.gasto),
        meta: s.meta != null ? moedaBRL(s.meta) : null,
      })),
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
        // Imagem antes do texto: é a ordem que a Anthropic recomenda quando a
        // pergunta é sobre a imagem.
        content: [
          ...(imagem
            ? ([
                {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: imagem.mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                    data: imagem.base64,
                  },
                },
              ])
            : []),
          {
            type: "text" as const,
            text:
              `CONTEXTO (única fonte de números):\n${JSON.stringify(resumoContexto, null, 2)}\n\n` +
              (imagem
                ? `${autor.toUpperCase()} MANDOU A FOTO ACIMA${texto ? ` com a legenda:\n${texto}` : " sem legenda."}`
                : `MENSAGEM DE ${autor.toUpperCase()}:\n${texto}`),
          },
        ],
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
