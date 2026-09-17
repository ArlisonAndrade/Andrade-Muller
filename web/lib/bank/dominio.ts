/** Aceita "https://www.netflix.com/br" e guarda só "netflix.com". */
export function normalizarDominio(valor: string): string | null {
  const limpo = valor
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#\s]/)[0];
  return limpo && limpo.includes(".") ? limpo : null;
}
