// Plano fixo em fases da Carteira do Arthur — decisão do Arlison em
// 13/ago/2026, substituindo o simulador de sliders. Não é mais "e se eu
// aportasse X" ajustável a qualquer momento: são 7 fases fechadas (0 a 6),
// com aporte mensal + aporte de aniversário definidos, pensadas pra render
// o máximo enquanto ele é criança e ir soltando o pé à medida que o tempo
// de composição dos juros fica mais curto. A Fase 6 (Colheita) não recebe
// aporte novo nenhum — só deixa o patrimônio já formado continuar rendendo.
//
// Os valores de metaFinal são a projeção a 10% a.a. (mesma premissa da
// família) rodando os aportes de cada fase mês a mês — não são chute.

export type FaseArthur = {
  numero: number;
  nome: string;
  emoji: string;
  idadeInicio: number;
  idadeFim: number;
  aporteMensal: number;
  aporteAniversario: number;
  metaFinal: number;
  descricao: string;
};

export const FASES_ARTHUR: FaseArthur[] = [
  {
    numero: 0,
    nome: "Primeiros anos",
    emoji: "👶",
    idadeInicio: 0,
    idadeFim: 4,
    aporteMensal: 0,
    aporteAniversario: 0,
    metaFinal: 20_000,
    descricao: "O que já foi construído até aqui — nasce no vermelho, e tudo bem.",
  },
  {
    numero: 1,
    nome: "Semente",
    emoji: "🌱",
    idadeInicio: 4,
    idadeFim: 7,
    aporteMensal: 600,
    aporteAniversario: 1_500,
    metaFinal: 54_213.54,
    descricao: "Onde o hábito começa — plantar cedo é o que dá tempo pro juro compor.",
  },
  {
    numero: 2,
    nome: "Base",
    emoji: "🌿",
    idadeInicio: 7,
    idadeFim: 10,
    aporteMensal: 800,
    aporteAniversario: 1_800,
    metaFinal: 111_323.56,
    descricao: "A carteira sai do zero de verdade e começa a ganhar corpo.",
  },
  {
    numero: 3,
    nome: "Ritmo",
    emoji: "🌳",
    idadeInicio: 10,
    idadeFim: 13,
    aporteMensal: 1_000,
    aporteAniversario: 2_100,
    metaFinal: 196_631.83,
    descricao: "Aporte e composição andando juntos — a curva começa a acelerar.",
  },
  {
    numero: 4,
    nome: "Aceleração",
    emoji: "🚀",
    idadeInicio: 13,
    idadeFim: 16,
    aporteMensal: 1_300,
    aporteAniversario: 2_300,
    metaFinal: 323_291.90,
    descricao: "Ainda dá tempo do dinheiro render bastante — é a hora de ir mais fundo.",
  },
  {
    numero: 5,
    nome: "Pico",
    emoji: "🏔️",
    idadeInicio: 16,
    idadeFim: 19,
    aporteMensal: 1_600,
    aporteAniversario: 2_500,
    metaFinal: 504_991.20,
    descricao: "O último trecho em que vale a pena aportar pesado — depois disso, o tempo já não compensa.",
  },
  {
    numero: 6,
    nome: "Colheita",
    emoji: "🌾",
    idadeInicio: 19,
    idadeFim: 20,
    aporteMensal: 0,
    aporteAniversario: 0,
    metaFinal: 555_490.32,
    descricao: "Sem aporte novo — só o que já foi plantado continuando a crescer sozinho.",
  },
];

export const META_FINAL_ARTHUR = FASES_ARTHUR[FASES_ARTHUR.length - 1].metaFinal;

export type StatusFase = "nao_iniciada" | "em_andamento" | "atrasada" | "concluida";

export const ROTULO_STATUS_FASE: Record<StatusFase, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
};

export const EMOJI_STATUS_FASE: Record<StatusFase, string> = {
  nao_iniciada: "🔒",
  em_andamento: "🟢",
  atrasada: "🔴",
  concluida: "✅",
};

// Status de cada fase comparando o patrimônio real de hoje com o que a
// curva planejada esperaria neste ponto (interpolação linear entre o fim
// da fase anterior e o fim desta — suficiente pra um selo, não precisa
// reproduzir a composição mês a mês aqui).
export function statusDaFase(
  fase: FaseArthur,
  idadeAtual: number,
  patrimonioAtual: number,
): StatusFase {
  const indice = FASES_ARTHUR.findIndex((f) => f.numero === fase.numero);
  const metaInicio = indice > 0 ? FASES_ARTHUR[indice - 1].metaFinal : 0;

  if (idadeAtual < fase.idadeInicio) return "nao_iniciada";

  if (idadeAtual >= fase.idadeFim) {
    return patrimonioAtual >= fase.metaFinal ? "concluida" : "atrasada";
  }

  const fracao = (idadeAtual - fase.idadeInicio) / (fase.idadeFim - fase.idadeInicio);
  const esperadoHoje = metaInicio + fracao * (fase.metaFinal - metaInicio);
  return patrimonioAtual >= esperadoHoje ? "em_andamento" : "atrasada";
}

// Curva planejada completa (idade → patrimônio-alvo), um ponto por fronteira
// de fase — pro gráfico comparar com o patrimônio real.
export function curvaPlanejadaArthur(): { idade: number; valor: number }[] {
  const pontos = [{ idade: 0, valor: 0 }];
  for (const fase of FASES_ARTHUR) {
    pontos.push({ idade: fase.idadeFim, valor: fase.metaFinal });
  }
  return pontos;
}

export function faseAtual(idadeAtual: number): FaseArthur {
  return (
    FASES_ARTHUR.find((f) => idadeAtual >= f.idadeInicio && idadeAtual < f.idadeFim) ??
    FASES_ARTHUR[FASES_ARTHUR.length - 1]
  );
}
