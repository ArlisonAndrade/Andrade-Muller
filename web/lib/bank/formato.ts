import type { FormaPagamento } from "@/lib/bank/tipos";

export function moedaBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  debito: "Débito",
  credito: "Crédito",
  pix: "Pix",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export function dataBR(iso: string | null) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function mesBR(iso: string) {
  const [ano, mes] = iso.slice(0, 7).split("-");
  return `${MESES[Number(mes) - 1]} de ${ano}`;
}
