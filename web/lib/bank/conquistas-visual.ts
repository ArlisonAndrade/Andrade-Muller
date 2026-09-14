// Tipos e cores das medalhas, separados de lib/bank/conquistas.ts porque a
// medalha é desenhada também em componente de cliente (comemoração) — e o
// avaliador puxa leitura de banco que não pode ir pro browser.

export type Nivel = "bronze" | "prata" | "ouro" | "diamante";
export type Trilha = "degraus" | "aporte" | "divida" | "semana" | "arthur" | "fases";

export const ROTULO_TRILHA: Record<Trilha, string> = {
  degraus: "🪜 Degraus do patrimônio",
  aporte: "💵 Aporte",
  divida: "🏦 Dívida",
  semana: "🧾 Semana no controle",
  arthur: "👦 Carteira do Arthur",
  fases: "🚩 Fases do plano",
};

export const COR_NIVEL: Record<Nivel, { fundo: string; borda: string; texto: string }> = {
  bronze: { fundo: "linear-gradient(135deg, #f3c89b, #b8733d)", borda: "#b8733d", texto: "#6b3d18" },
  prata: { fundo: "linear-gradient(135deg, #f1f5f9, #94a3b8)", borda: "#94a3b8", texto: "#334155" },
  ouro: { fundo: "linear-gradient(135deg, #fde68a, #d97706)", borda: "#d97706", texto: "#78350f" },
  diamante: { fundo: "linear-gradient(135deg, #cffafe, #6366f1)", borda: "#6366f1", texto: "#312e81" },
};
