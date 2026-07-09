export function moedaBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataBR(iso: string | null) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function diasDesde(iso: string) {
  const data = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.floor((Date.now() - data.getTime()) / 86_400_000);
}
