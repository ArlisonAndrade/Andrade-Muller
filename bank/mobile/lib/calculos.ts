type TransacaoComTipo = { valor: number; categoria?: { tipo: "receita" | "despesa" } | null };
type ContaComSaldo = { saldo_inicial: number };
type PosicaoComQuantidade = { ativo_id: string; quantidade_atual: number; preco_medio: number | null };

export function saldoContas(contas: ContaComSaldo[]) {
  return contas.reduce((soma, c) => soma + Number(c.saldo_inicial), 0);
}

export function fluxoTransacoes(transacoes: TransacaoComTipo[]) {
  return transacoes.reduce((soma, t) => {
    const sinal = t.categoria?.tipo === "despesa" ? -1 : 1;
    return soma + sinal * Number(t.valor);
  }, 0);
}

export function valorInvestido(posicoes: PosicaoComQuantidade[], cotacoes: Map<string, number>) {
  return posicoes.reduce((soma, p) => {
    const preco = cotacoes.get(p.ativo_id) ?? Number(p.preco_medio) ?? 0;
    return soma + Number(p.quantidade_atual) * preco;
  }, 0);
}

export function patrimonio(
  contas: ContaComSaldo[],
  transacoes: TransacaoComTipo[],
  posicoes: PosicaoComQuantidade[],
  cotacoes: Map<string, number>,
) {
  return saldoContas(contas) + fluxoTransacoes(transacoes) + valorInvestido(posicoes, cotacoes);
}
