// Classes de ativo do Bank — rótulo PT + cor (token do globals.css).
// Consistente em donut, linhas de classe e badges; nunca cor aleatória.

export type ClasseAtivo =
  | "acao"
  | "fii"
  | "etf_internacional"
  | "fundo"
  | "tesouro"
  | "renda_fixa"
  | "cripto"
  | "ouro"
  | "especie"
  | "outro";

// Cores em hex (mesmos valores dos tokens --color-classe-* do globals.css)
// porque o Chart.js pinta em canvas e não resolve var() do CSS.
export const CLASSES_ATIVOS: Record<
  ClasseAtivo,
  { rotulo: string; rotuloCurto: string; cor: string }
> = {
  acao: { rotulo: "Ações", rotuloCurto: "Ações", cor: "#2563eb" },
  fii: { rotulo: "Fundos Imobiliários", rotuloCurto: "FIIs", cor: "#7c3aed" },
  renda_fixa: { rotulo: "Renda Fixa", rotuloCurto: "Renda Fixa", cor: "#0d9488" },
  etf_internacional: { rotulo: "ETFs Internacionais", rotuloCurto: "ETFs Intern.", cor: "#ea580c" },
  cripto: { rotulo: "Criptomoedas", rotuloCurto: "Criptos", cor: "#f59e0b" },
  fundo: { rotulo: "Fundos de Investimento", rotuloCurto: "Fundos", cor: "#db2777" },
  tesouro: { rotulo: "Tesouro Direto", rotuloCurto: "Tesouro", cor: "#64748b" },
  ouro: { rotulo: "Ouro físico", rotuloCurto: "Ouro", cor: "#b8860b" },
  especie: { rotulo: "Dinheiro em espécie", rotuloCurto: "Espécie", cor: "#15803d" },
  outro: { rotulo: "Outros", rotuloCurto: "Outros", cor: "#94a3b8" },
};

export const ORDEM_CLASSES: ClasseAtivo[] = [
  "acao",
  "fii",
  "renda_fixa",
  "etf_internacional",
  "cripto",
  "fundo",
  "tesouro",
  "ouro",
  "especie",
  "outro",
];

// Patrimônio que não está na corretora (migration 26): ouro físico e o
// dinheiro dos cofres. Entra somado ao resto, mas fica de fora do que só faz
// sentido pra carteira — meta de alocação e rentabilidade (o ouro é de 2018 e
// carregaria 8 anos de valorização pra dentro de um número que mede a
// carteira desde que ela começou).
const CLASSES_FORA_DA_CORRETORA = new Set<ClasseAtivo>(["ouro", "especie"]);

export const foraDaCorretora = (classe: ClasseAtivo) => CLASSES_FORA_DA_CORRETORA.has(classe);

export function classeDe(tipo: string | null): ClasseAtivo {
  return (tipo && tipo in CLASSES_ATIVOS ? tipo : "outro") as ClasseAtivo;
}

// Pra que cada posição existe — demarcação manual do Arlison em 13/ago/2026
// (marcada à mão em cima do print do "Meus Ativos"): toda Renda Fixa é
// reserva de emergência; Fundos de Investimento + Cripto são a carteira do
// Arthur (guardada dentro da entidade Família — ainda não migrada pra
// ENTIDADE_ARTHUR); o resto (Ações, FIIs, ETFs Internacionais, Tesouro) é
// investimento de verdade da família. É por classe, não por ativo — não dá
// pra ter Renda Fixa "livre" e Renda Fixa "reserva" ao mesmo tempo.
export type FinalidadeCarteira = "reserva_emergencia" | "arthur" | "investimentos";

export const ROTULO_FINALIDADE: Record<FinalidadeCarteira, string> = {
  reserva_emergencia: "Reserva de emergência",
  arthur: "Carteira do Arthur",
  investimentos: "Investimentos",
};

// Mesmos tons de --color-bank-negativo/primaria/positivo do globals.css,
// em hex pro Chart.js (que não resolve var() em canvas).
export const COR_FINALIDADE: Record<FinalidadeCarteira, string> = {
  reserva_emergencia: "#dc2626",
  arthur: "#2563eb",
  investimentos: "#16a34a",
};

const FINALIDADE_DA_CLASSE: Record<ClasseAtivo, FinalidadeCarteira> = {
  renda_fixa: "reserva_emergencia",
  fundo: "arthur",
  cripto: "arthur",
  acao: "investimentos",
  fii: "investimentos",
  etf_internacional: "investimentos",
  tesouro: "investimentos",
  ouro: "investimentos",
  especie: "reserva_emergencia",
  outro: "investimentos",
};

export function finalidadeDaClasse(classe: ClasseAtivo): FinalidadeCarteira {
  return FINALIDADE_DA_CLASSE[classe];
}

// A finalidade deixou de ser só da classe (migration 26): o mesmo "dinheiro em
// espécie" é reserva de emergência no cofre de casa e carteira do Arthur no
// cofrinho dele. `ativos.finalidade` manda quando está preenchida; sem ela,
// vale a da classe — que é como as 24 posições do Investidor10 seguem sendo
// repartidas.
export function finalidadeDe(
  tipo: string | null,
  finalidade?: string | null,
): FinalidadeCarteira {
  if (finalidade && finalidade in ROTULO_FINALIDADE) return finalidade as FinalidadeCarteira;
  return finalidadeDaClasse(classeDe(tipo));
}
