/**
 * Marcos da meta semanal — 75%, 90%, 100% e a vitória de fechar dentro.
 *
 * Calculados aqui, no código, e não pedidos ao modelo (decisão do Arlison,
 * 20/ago/2026). Marco é régua: tem que disparar sempre no mesmo ponto, com o
 * mesmo texto, sem depender de o modelo lembrar. O modelo continua dono da
 * frase de análise; o marco é fato.
 *
 * As passagens são o ensinamento do "O Homem Mais Rico da Babilônia"
 * reescrito em uma linha — não transcrição do livro. É de propósito: frase
 * curta cabe no Telegram, e paráfrase honesta é melhor que citação literal
 * que ninguém aqui pode conferir.
 */

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
export function marcoCruzado(antes: number, depois: number, meta: number | null): FaixaMeta | null {
  if (meta == null || meta <= 0) return null;
  const de = faixaDaSemana(antes, meta);
  const para = faixaDaSemana(depois, meta);
  if (de === para) return null;
  return para === "tranquila" ? null : para;
}

const PASSAGENS: Record<Exclude<FaixaMeta, "tranquila">, string[]> = {
  atencao: [
    "A segunda cura: o que você chama de necessidade cresce até engolir tudo que entra, se você deixar.",
    "Arkad separava a décima parte antes de gastar o resto — nunca o que sobrava no fim.",
    "Necessidade e desejo se parecem no momento da compra. Só um deles ainda parece necessário no fim da semana.",
    "Bansir trabalhou a vida inteira e não tinha nada: não porque ganhava pouco, mas porque nunca decidiu para onde ia o que ganhava.",
  ],
  perigo: [
    "As sete moedas de Dabasir eram para viver a semana inteira — não os três primeiros dias dela.",
    "A quarta cura é proteger o principal. Aqui o principal é o que ainda falta a semana atravessar.",
    "Dabasir pagou os credores sem parar de guardar a décima parte. Segurar agora é o que mantém as duas coisas de pé.",
  ],
  estourada: [
    "Dabasir não fugiu da conta uma segunda vez: foi olhar credor por credor, de cara limpa. A semana estourada se encara igual.",
    "A primeira cura não é sobre a semana perfeita — é sobre voltar a separar a décima parte na próxima, sem drama.",
    "O ouro foge de quem não olha para onde ele vai. Olhar o estouro já é metade do caminho de volta.",
  ],
};

const VITORIAS = [
  "Semana fechada dentro da meta. É assim que Arkad enchia a bolsa: uma semana de cada vez, não num golpe de sorte.",
  "Fechou dentro. A primeira cura em ação — e ela só funciona repetida.",
  "Meta cumprida. O ouro fica com quem decide para onde ele vai antes de ele ir.",
];

/**
 * Escolhe por rodízio determinístico a partir da data: a mesma semana sempre
 * dá a mesma frase (nada de sortear a cada reentrega da mensagem), semanas
 * diferentes dão frases diferentes.
 */
function escolher(pool: string[], semente: string): string {
  let n = 0;
  for (const ch of semente) n = (n + ch.charCodeAt(0)) % 100000;
  return pool[n % pool.length];
}

/** A linha do marco, pronta para o Telegram. `semente`: início da semana. */
export function linhaMarco(faixa: FaixaMeta, semente: string): string[] {
  if (faixa === "tranquila") return [];
  const passagem = escolher(PASSAGENS[faixa], semente);

  if (faixa === "atencao") {
    return ["⚠️ 75% da meta da semana — atenção.", `📖 ${passagem}`];
  }
  if (faixa === "perigo") {
    return ["🚨 90% da meta — zona de perigo.", `📖 ${passagem}`];
  }
  return ["💸 A meta da semana se foi.", `📖 ${passagem}`];
}

/** A linha de vitória, para quando a semana fecha dentro da meta. */
export function linhaVitoria(semente: string): string {
  return `🏆 ${escolher(VITORIAS, semente)}`;
}
