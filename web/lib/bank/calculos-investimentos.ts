import { classeDe, type ClasseAtivo } from "@/lib/bank/classes-ativos";

export type PosicaoDetalhada = {
  ativo_id: string;
  ticker: string;
  tipo: string | null;
  nome?: string | null;
  quantidade_atual: number;
  preco_medio: number | null;
};

export type Cotacao = { preco_atual: number | null; variacao_dia_pct: number | null };

export type AtivoResumo = {
  ativo_id: string;
  ticker: string;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
  valorAplicado: number;
  valorMercado: number;
  variacaoDiaPct: number | null;
  rentabilidadePct: number | null;
};

export type ClasseResumo = {
  classe: ClasseAtivo;
  quantidadeAtivos: number;
  valorAplicado: number;
  valorMercado: number;
  variacaoDiaPct: number | null; // média ponderada pelo valor de mercado
  rentabilidadePct: number | null;
  percentualCarteira: number;
  percentualAlvo: number | null;
  ativos: AtivoResumo[];
};

export function resumirAtivo(p: PosicaoDetalhada, cotacoes: Map<string, Cotacao>): AtivoResumo {
  const quantidade = Number(p.quantidade_atual);
  const precoMedio = Number(p.preco_medio ?? 0);
  const cot = cotacoes.get(p.ativo_id);
  const precoAtual = Number(cot?.preco_atual ?? precoMedio);
  const valorAplicado = quantidade * precoMedio;
  const valorMercado = quantidade * precoAtual;
  return {
    ativo_id: p.ativo_id,
    ticker: p.ticker,
    quantidade,
    precoMedio,
    precoAtual,
    valorAplicado,
    valorMercado,
    variacaoDiaPct: cot?.variacao_dia_pct != null ? Number(cot.variacao_dia_pct) : null,
    rentabilidadePct: valorAplicado > 0 ? (valorMercado / valorAplicado - 1) * 100 : null,
  };
}

export function agregarPorClasse(
  posicoes: PosicaoDetalhada[],
  cotacoes: Map<string, Cotacao>,
  metasAlvo: Map<string, number>,
): ClasseResumo[] {
  const comSaldo = posicoes.filter((p) => Number(p.quantidade_atual) > 0);
  const porClasse = new Map<ClasseAtivo, AtivoResumo[]>();
  for (const p of comSaldo) {
    const classe = classeDe(p.tipo);
    const grupo = porClasse.get(classe) ?? [];
    grupo.push(resumirAtivo(p, cotacoes));
    porClasse.set(classe, grupo);
  }

  const totalMercado = [...porClasse.values()]
    .flat()
    .reduce((s, a) => s + a.valorMercado, 0);

  const resumos: ClasseResumo[] = [];
  for (const [classe, ativos] of porClasse) {
    const valorAplicado = ativos.reduce((s, a) => s + a.valorAplicado, 0);
    const valorMercado = ativos.reduce((s, a) => s + a.valorMercado, 0);
    // Variação do dia ponderada — só conta ativos com cotação do dia.
    const comVariacao = ativos.filter((a) => a.variacaoDiaPct != null && a.valorMercado > 0);
    const pesoVariacao = comVariacao.reduce((s, a) => s + a.valorMercado, 0);
    const variacaoDiaPct =
      pesoVariacao > 0
        ? comVariacao.reduce((s, a) => s + (a.variacaoDiaPct as number) * a.valorMercado, 0) /
          pesoVariacao
        : null;
    resumos.push({
      classe,
      quantidadeAtivos: ativos.length,
      valorAplicado,
      valorMercado,
      variacaoDiaPct,
      rentabilidadePct: valorAplicado > 0 ? (valorMercado / valorAplicado - 1) * 100 : null,
      percentualCarteira: totalMercado > 0 ? (valorMercado / totalMercado) * 100 : 0,
      percentualAlvo: metasAlvo.get(classe) ?? null,
      ativos: ativos.sort((a, b) => b.valorMercado - a.valorMercado),
    });
  }
  return resumos.sort((a, b) => b.valorMercado - a.valorMercado);
}

export type SnapshotMensal = {
  competencia: string;
  valor_aplicado: number;
  valor_mercado: number;
};

// Rentabilidade 12M aproximada pela razão dos múltiplos de custo
// (mercado/aplicado hoje ÷ mercado/aplicado há 12M) — neutraliza o efeito
// dos aportes sem precisar de fluxo de caixa diário. Com menos de 2
// snapshots ainda não há série: devolve null (a UI mostra a total).
export function rentabilidade12M(
  snapshots: SnapshotMensal[],
  aplicadoAtual: number,
  mercadoAtual: number,
): number | null {
  if (snapshots.length < 2 || aplicadoAtual <= 0) return null;
  const antigos = [...snapshots].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const base = antigos[0];
  const baseAplicado = Number(base.valor_aplicado);
  const baseMercado = Number(base.valor_mercado);
  if (baseAplicado <= 0 || baseMercado <= 0) return null;
  const multiploAtual = mercadoAtual / aplicadoAtual;
  const multiploBase = baseMercado / baseAplicado;
  return (multiploAtual / multiploBase - 1) * 100;
}
