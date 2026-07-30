// Datas do agente sempre em America/Sao_Paulo.
//
// Não é preciosismo: o app roda na Vercel em UTC, então um gasto lançado às
// 21h no grupo do Telegram cairia no dia seguinte se usássemos `new Date()`
// direto. Como o Bank fecha semana e mês por data, isso jogaria o lançamento
// na semana errada uma vez por dia, todo dia.

const FUSO = "America/Sao_Paulo";

const formatadorISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data de hoje em São Paulo, no formato AAAA-MM-DD. */
export function hojeSP(): string {
  return formatadorISO.format(new Date());
}

/** Hora do dia (0–23) em São Paulo — usada nos resumos por horário. */
export function horaSP(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: FUSO,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
}

// As funções abaixo tratam a data como rótulo (AAAA-MM-DD), ancorando no meio
// do dia em UTC para nenhuma soma/subtração escorregar por horário de verão.
function ancora(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`);
}

export function somarDias(iso: string, dias: number): string {
  const d = ancora(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana de `iso` — é a `semana_inicio` de semanas_orcamento. */
export function segundaDaSemana(iso: string): string {
  const d = ancora(iso);
  const diaSemana = (d.getUTCDay() + 6) % 7; // 0 = segunda, 6 = domingo
  return somarDias(iso, -diaSemana);
}

/** Primeiro dia do mês de `iso`. */
export function primeiroDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Dias que ainda faltam para o domingo, contando hoje. */
export function diasRestantesNaSemana(iso: string): number {
  const d = ancora(iso);
  const diaSemana = (d.getUTCDay() + 6) % 7;
  return 7 - diaSemana;
}
