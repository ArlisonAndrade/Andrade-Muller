import { hojeSP } from "@/lib/bank/agente/datas";
import { mesesDoTrimestre } from "@/lib/bank/trimestre";

// Datas do ciclo trimestral: tudo acontece no mês seguinte ao fechamento do
// trimestre (jan, abr, jul, out) — convocação no dia 5, cobrança no 15,
// balanço no 25. Os agendamentos ficam no n8n; aqui só a conta.

/** O mês do ciclo, AAAA-MM. */
export function mesDoCiclo(trimestre: string): string {
  const ultimo = mesesDoTrimestre(trimestre)[2];
  const ano = Math.floor(ultimo / 100);
  const mes = ultimo % 100;
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

/** Dia em que o balanço sai (25 do mês do ciclo), AAAA-MM-DD. */
export const diaDoBalanco = (trimestre: string) => `${mesDoCiclo(trimestre)}-25`;

/** "15/01" */
export const dataCurta = (trimestre: string, dia: number) => `${String(dia).padStart(2, "0")}/${mesDoCiclo(trimestre).slice(5)}`;

/** Se já chegou o dia do balanço: só então decisão completa vira PDF na hora. */
export const balancoJaPodeSair = (trimestre: string) => hojeSP() >= diaDoBalanco(trimestre);
