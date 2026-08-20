/**
 * Marcos da meta semanal — 75%, 90%, 100% e a vitória de fechar dentro.
 *
 * Calculados aqui, no código, e não pedidos ao modelo (decisão do Arlison,
 * 20/ago/2026). Marco é régua: tem que disparar sempre no mesmo ponto, com o
 * mesmo texto, sem depender de o modelo lembrar. O modelo continua dono da
 * frase de análise; o marco é fato.
 *
 * A frase que acompanha o marco é ESCRITA NA HORA pelo modelo (decisão do
 * Arlison, 20/ago/2026): ele lê os números daquele momento e escolhe o
 * princípio que cabe, com liberdade de analogia. Uma lista fixa entregava
 * sempre o mesmo texto no mesmo lugar e envelhecia rápido.
 *
 * As listas continuam aqui embaixo como REDE: se a chamada falhar, o marco sai
 * com uma frase de repertório em vez de sair mudo. Marco sem frase é pior que
 * frase repetida.
 *
 * As passagens são o ensinamento do "O Homem Mais Rico da Babilônia"
 * reescrito — não transcrição do livro, aqui nem no que o modelo compõe.
 */
import Anthropic from "@anthropic-ai/sdk";
import { DOUTRINA_ARKAD } from "@/lib/bank/agente/arkad";

export type FaixaMeta = "tranquila" | "atencao" | "perigo" | "estourada";

export function faixaDaSemana(gasto: number, meta: number | null): FaixaMeta {
  if (meta == null || meta <= 0) return "tranquila";
  const p = (gasto / meta) * 100;
  if (p >= 100) return "estourada";
  if (p >= 90) return "perigo";
  if (p >= 75) return "atencao";
  return "tranquila";
}

/** O emoji que abre a linha de status da semana. Um por linha, sem enfeite. */
export const EMOJI_FAIXA: Record<FaixaMeta, string> = {
  tranquila: "🟢",
  atencao: "🟡",
  perigo: "🟠",
  estourada: "🔴",
};

/**
 * O marco só dispara na TRAVESSIA — quando este gasto cruzou a linha. Sem
 * isto, tudo entre 75% e 100% viria com aviso, e aviso repetido vira ruído
 * que eles aprendem a pular.
 */
export function marcoCruzado(
  antes: number,
  depois: number,
  meta: number | null,
): Exclude<FaixaMeta, "tranquila"> | null {
  if (meta == null || meta <= 0) return null;
  const de = faixaDaSemana(antes, meta);
  const para = faixaDaSemana(depois, meta);
  if (de === para) return null;
  return para === "tranquila" ? null : para;
}

/** Rede de segurança: só entra em cena se a composição na hora falhar. */
const PASSAGENS: Record<Exclude<FaixaMeta, "tranquila">, string[]> = {
  atencao: [
    "A segunda cura: o que você chama de necessidade cresce até engolir tudo que entra, se você deixar.",
    "Arkad separava a décima parte antes de gastar o resto — nunca o que sobrava no fim.",
    "Necessidade e desejo se parecem na hora da compra. Só um dos dois ainda parece necessário no fim da semana.",
    "Bansir trabalhou a vida inteira e não tinha nada: não porque ganhava pouco, mas porque nunca decidiu para onde ia o que ganhava.",
    "Algamish voltou um ano depois e perguntou a Arkad o que ele tinha feito com o que guardara. A pergunta ainda serve: para onde foi o que sobrou do mês passado?",
    "O orçamento não existe para proibir gasto. Existe para que o gasto que importa não fique sem lugar.",
    "Kobbi, o músico, ganhava bem nas noites boas e não tinha nada nas ruins. Renda irregular não é desculpa — é o motivo de separar antes.",
    "Uma bolsa que se esvazia rápido demais não tem furo no fundo: tem mão frequente demais na abertura.",
    "A terceira cura lembra que moeda parada não trabalha. Mas moeda gasta não volta para trabalhar nenhum dia.",
    "Arkad não ficou rico ganhando mais que os outros escribas. Ficou por guardar o que os outros passavam adiante.",
  ],
  perigo: [
    "As sete moedas de Dabasir eram para viver a semana inteira — não os três primeiros dias dela.",
    "A quarta cura é proteger o principal. Aqui o principal é o que ainda falta a semana atravessar.",
    "Dabasir pagou os credores sem parar de guardar a décima parte. Segurar agora é o que mantém as duas coisas de pé.",
    "Não é o gasto grande que estoura a semana. É o quarto gasto pequeno depois de já estar perto do limite.",
    "Arkad aprendeu a diferença entre o conselho do vendedor e o conselho de quem entende. Perto do limite, todo desejo vira vendedor.",
    "A quinta lei fala de quem confia em ganho fácil. Aqui o ganho fácil é acreditar que dá para gastar mais e a semana se ajeita.",
    "Faltam poucos reais entre fechar dentro e fechar fora. Essa distância se decide numa escolha, não em dez.",
    "Quem chega a este ponto da semana toda vez não tem problema de valor: tem problema de calendário.",
  ],
  estourada: [
    "Dabasir não fugiu da conta uma segunda vez: foi olhar credor por credor, de cara limpa. A semana estourada se encara igual.",
    "A primeira cura não é sobre a semana perfeita — é sobre voltar a separar a décima parte na próxima, sem drama.",
    "O ouro foge de quem não olha para onde ele vai. Olhar o estouro já é metade do caminho de volta.",
    "Dabasir levou anos para pagar tudo, uma tábua de argila por vez. Semana estourada é uma tábua, não a história inteira.",
    "Arkad errou antes de acertar: entregou as primeiras economias a um fabricante de tijolos para comprar joias, e perdeu tudo. O erro dele virou a terceira lei.",
    "Estourar a meta uma vez é dado. Estourar toda semana é a meta errada — e aí o conserto é na meta, não em vocês.",
    "O que aconteceu já é passado do orçamento. A pergunta útil é qual gasto da próxima semana já está decidido.",
  ],
};

const VITORIAS = [
  "Semana fechada dentro da meta. É assim que Arkad enchia a bolsa: uma semana de cada vez, não num golpe de sorte.",
  "Fechou dentro. A primeira cura em ação — e ela só funciona repetida.",
  "Meta cumprida. O ouro fica com quem decide para onde ele vai antes de ele ir.",
  "Semana no azul. Algamish diria que a parte que vocês guardaram é a única que era de vocês desde o começo.",
  "Fechou dentro de novo. O que era esforço vira hábito por repetição, e hábito não pesa.",
  "Dentro da meta. Bansir levou uma vida para entender o que vocês fizeram esta semana.",
];

/**
 * Rodízio de verdade: percorre a lista em ordem, uma posição por semana, e só
 * volta ao começo depois de esgotá-la. A versão anterior sorteava pela soma
 * dos caracteres da data, o que podia repetir a mesma frase em semanas
 * seguidas por azar — o tipo de coincidência que faz o bot parecer um script
 * de três falas.
 *
 * `semana` é a segunda-feira em AAAA-MM-DD; o índice sai do número de semanas
 * desde a época, então é estável entre reentregas da mesma mensagem.
 */
function escolher(pool: string[], semana: string): string {
  const dias = Math.floor(Date.parse(`${semana}T00:00:00Z`) / 86_400_000);
  const indice = Math.floor(dias / 7);
  return pool[((indice % pool.length) + pool.length) % pool.length];
}

export type DadosDoMomento = {
  gasto: number;
  meta: number;
  diasRestantes: number;
  semanaInicio: string;
  /** A categoria que mais pesou na semana — o gancho concreto da analogia. */
  categoriaLider: { nome: string; gasto: number } | null;
};

const ROTULO: Record<Exclude<FaixaMeta, "tranquila">, string> = {
  atencao: "⚠️ 75% da meta da semana — atenção.",
  perigo: "🚨 90% da meta — zona de perigo.",
  estourada: "💸 A meta da semana se foi.",
};

/**
 * A frase do momento. O rótulo acima é fato e nunca muda; isto aqui é a
 * leitura do Arkad sobre ESTA semana — por isso vale uma chamada própria, com
 * a doutrina inteira na frente do modelo e os números do momento.
 *
 * Roda em Opus 5 de propósito, apesar da interpretação rodar em Haiku: marco
 * acontece duas ou três vezes por semana, é o instante em que a frase precisa
 * acertar, e o custo de umas poucas chamadas por semana é irrelevante.
 */
export async function passagemDoMomento(
  faixa: Exclude<FaixaMeta, "tranquila">,
  dados: DadosDoMomento,
): Promise<string> {
  const reserva = escolher(PASSAGENS[faixa], dados.semanaInicio);
  if (!process.env.ANTHROPIC_API_KEY) return reserva;

  const situacao =
    faixa === "atencao"
      ? "Eles acabaram de cruzar 75% da meta da semana."
      : faixa === "perigo"
        ? "Eles acabaram de cruzar 90% da meta da semana."
        : "Eles acabaram de estourar a meta da semana.";

  try {
    const anthropic = new Anthropic();
    const resposta = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 400,
      output_config: { effort: "low" },
      system: [
        `Você é o Arkad, consultor financeiro da família Andrade Muller.`,
        DOUTRINA_ARKAD,
        "",
        "TAREFA: escreva UMA frase — no máximo duas, curtas — ligando um princípio da Babilônia ao momento exato que os números mostram.",
        "- Escolha o princípio que cabe NESTE caso. Não recite o que estiver mais à mão.",
        "- Analogia é bem-vinda: a semana como a bolsa de Arkad, a categoria que pesou como a mão frequente demais na abertura, a dívida como os credores de Dabasir. Seja concreto com a vida deles, não poético no vazio.",
        "- Pode nomear o princípio ('a segunda cura', 'a quarta lei') e usar os personagens (Bansir, Kobbi, Algamish, Dabasir, Nomasir).",
        "- NÃO repita os números: o app já mostrou o total, a meta e o percentual na linha de cima. Você pode citar a categoria pelo nome.",
        "- Nunca invente citação literal do livro. Trabalhe com os princípios que estão acima.",
        "- Sem emoji, sem saudação, sem moralismo. Fale como quem conhece a casa.",
        "Responda só com a frase, nada mais.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [
            situacao,
            `Faltam ${dados.diasRestantes} dia(s) para a semana fechar.`,
            dados.categoriaLider
              ? `A categoria que mais pesou foi ${dados.categoriaLider.nome}.`
              : "",
            `Proporção gasta da meta até aqui: ${Math.round((dados.gasto / dados.meta) * 100)}%.`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const bloco = resposta.content.find((b) => b.type === "text");
    const frase = bloco && bloco.type === "text" ? bloco.text.trim() : "";
    return frase || reserva;
  } catch {
    // Marco é régua: se a composição falhar, ele sai mesmo assim.
    return reserva;
  }
}

/** As linhas do marco, prontas para o Telegram. */
export function linhaMarco(faixa: FaixaMeta, passagem: string): string[] {
  if (faixa === "tranquila") return [];
  return [ROTULO[faixa], `📖 ${passagem}`];
}

/** A linha de vitória, para quando a semana fecha dentro da meta. */
export function linhaVitoria(semana: string): string {
  return `🏆 ${escolher(VITORIAS, semana)}`;
}
