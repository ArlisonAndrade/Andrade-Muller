// Matemática de dívida (tabela Price) — funções puras, testáveis.

export type ParcelaCalculada = {
  numero: number;
  data_vencimento: string; // ISO
  valor_parcela: number;
  valor_amortizacao: number;
  valor_juros: number;
};

function arred(v: number) {
  return Math.round(v * 100) / 100;
}

function somarMeses(iso: string, meses: number) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  // Dia fixo do contrato; new Date lida com overflow de mês.
  const d = new Date(ano, mes - 1 + meses, dia);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Cronograma Price: PMT = S·i / (1 − (1+i)^−n). A última parcela absorve o
// resíduo de arredondamento pra zerar o saldo exato.
export function cronogramaPrice(
  saldoDevedor: number,
  taxaMensalPct: number,
  numParcelas: number,
  primeiroVencimento: string,
): ParcelaCalculada[] {
  const i = taxaMensalPct / 100;
  const n = Math.max(1, Math.round(numParcelas));
  const pmt =
    i > 0 ? (saldoDevedor * i) / (1 - Math.pow(1 + i, -n)) : saldoDevedor / n;

  const parcelas: ParcelaCalculada[] = [];
  let saldo = saldoDevedor;
  for (let k = 1; k <= n; k++) {
    const juros = arred(saldo * i);
    let amortizacao = arred(pmt - juros);
    let valorParcela = arred(pmt);
    if (k === n) {
      // Última: quita o saldo restante exato.
      amortizacao = arred(saldo);
      valorParcela = arred(amortizacao + juros);
    }
    saldo = arred(saldo - amortizacao);
    parcelas.push({
      numero: k,
      data_vencimento: somarMeses(primeiroVencimento, k - 1),
      valor_parcela: valorParcela,
      valor_amortizacao: amortizacao,
      valor_juros: juros,
    });
  }
  return parcelas;
}

export type ParcelaLida = {
  numero: number;
  valor_parcela: number;
  valor_amortizacao: number | null;
  valor_juros: number | null;
  paga: boolean;
  adiantada: boolean;
  valor_pago_efetivo: number | null;
  data_vencimento: string;
};

export function resumoDivida<T extends ParcelaLida>(parcelas: T[]) {
  const pagas = parcelas.filter((p) => p.paga);
  const abertas = parcelas.filter((p) => !p.paga).sort((a, b) => a.numero - b.numero);
  const totalPago = pagas.reduce((s, p) => s + Number(p.valor_pago_efetivo ?? p.valor_parcela), 0);
  const restante = abertas.reduce((s, p) => s + Number(p.valor_parcela), 0);
  const jurosEconomizados = pagas
    .filter((p) => p.adiantada)
    .reduce((s, p) => s + Number(p.valor_juros ?? 0), 0);
  const proxima = abertas[0] ?? null;
  const ultimaAberta = abertas[abertas.length - 1] ?? null;
  return { totalPago, restante, jurosEconomizados, proxima, ultimaAberta, abertas, pagas };
}
