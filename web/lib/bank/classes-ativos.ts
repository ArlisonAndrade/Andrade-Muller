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
  "outro",
];

export function classeDe(tipo: string | null): ClasseAtivo {
  return (tipo && tipo in CLASSES_ATIVOS ? tipo : "outro") as ClasseAtivo;
}

// Só ações, FIIs e ETFs B3 têm cotação automática (brapi.dev). O resto
// (renda fixa, tesouro, fundos, cripto, internacional) atualiza manual.
export function temCotacaoAutomatica(tipo: string | null) {
  return tipo === "acao" || tipo === "fii";
}
