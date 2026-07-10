export function moedaBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataBR(iso: string | null) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

// Data+hora sem conversão de fuso: exibe exatamente o que foi digitado no form.
export function dataHoraBR(iso: string) {
  const [data, hora] = iso.slice(0, 16).split("T");
  return `${dataBR(data)} às ${hora}`;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function mesBR(iso: string) {
  const [ano, mes] = iso.slice(0, 7).split("-");
  return `${MESES[Number(mes) - 1]} de ${ano}`;
}

// "2025-10-01" → "out/25" (rótulo curto de eixo)
export function mesCurto(iso: string) {
  const [ano, mes] = iso.slice(0, 7).split("-");
  return `${MESES[Number(mes) - 1].slice(0, 3)}/${ano.slice(2)}`;
}

// "2025-10-01" → "4T25"
export function rotuloTrimestre(iso: string) {
  const [ano, mes] = iso.slice(0, 7).split("-");
  return `${Math.ceil(Number(mes) / 3)}T${ano.slice(2)}`;
}

export function diasDesde(iso: string) {
  const data = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.floor((Date.now() - data.getTime()) / 86_400_000);
}
