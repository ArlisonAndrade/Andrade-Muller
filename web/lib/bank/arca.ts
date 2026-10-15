import { CLASSES_ATIVOS, classeDe, type ClasseAtivo } from "@/lib/bank/classes-ativos";
import { resumirAtivo, type Cotacao, type PosicaoDetalhada } from "@/lib/bank/calculos-investimentos";

// A carteira no modelo ARCA (pedido do Arlison, 12/out/2026): Ações, Real
// estate, Caixa e Ativos internacionais, 25% em cada. Substitui o donut de
// alocação e o gráfico de evolução na página de investimentos — os dois eram
// cópia do que ele já tem no Investidor10. O que o espelho não dá e isto dá:
// a distância até o equilíbrio e para onde vai o próximo aporte.

export type BaldeArca = "acoes" | "imoveis" | "caixa" | "internacional";

export const BALDES: Array<{
  chave: BaldeArca;
  letra: string;
  nome: string;
  cor: string;
  contem: string;
}> = [
  { chave: "acoes", letra: "A", nome: "Ações", cor: "#2a78d6", contem: "ações brasileiras" },
  { chave: "imoveis", letra: "R", nome: "Imóveis · FIIs", cor: "#eb6834", contem: "fundos imobiliários" },
  { chave: "caixa", letra: "C", nome: "Caixa", cor: "#1baf7a", contem: "renda fixa, Tesouro, fundos de RF e o dinheiro parado" },
  { chave: "internacional", letra: "A", nome: "Internacional", cor: "#eda100", contem: "ETFs lá fora e cripto" },
];

// Cripto entra em "internacional" (ativo global, dolarizado) e o fundo XP, que
// é de renda fixa, entra em caixa. O ouro fica FORA: são joias, e ninguém vende
// 10 gramas pra rebalancear — dentro de uma letra ele só distorceria a conta do
// aporte (decisão do Arlison, 12/out/2026).
const BALDE_DA_CLASSE: Partial<Record<ClasseAtivo, BaldeArca>> = {
  acao: "acoes",
  fii: "imoveis",
  renda_fixa: "caixa",
  tesouro: "caixa",
  fundo: "caixa",
  especie: "caixa",
  conta: "caixa",
  etf_internacional: "internacional",
  cripto: "internacional",
};

export const ALVO = 0.25;

export type FatiaArca = {
  chave: BaldeArca;
  letra: string;
  nome: string;
  cor: string;
  valor: number;
  percentual: number;
  /** Quanto falta pra chegar nos 25% (0 quando já passou). */
  falta: number;
  /** Quanto passou dos 25% (0 quando ainda não chegou). */
  excesso: number;
};

export type CarteiraArca = {
  fatias: FatiaArca[];
  total: number;
  /** 0–100: quanto a carteira já está perto dos 25% em cada letra. */
  equilibrio: number;
  /** Ouro e o que mais não se rebalança — some do ARCA, não do patrimônio. */
  fora: { valor: number; itens: Array<{ rotulo: string; valor: number }> };
  /** O aporte do mês repartido entre as letras atrasadas. */
  reparticao: Array<{ chave: BaldeArca; letra: string; nome: string; cor: string; valor: number }>;
};

export function montarArca(
  posicoes: PosicaoDetalhada[],
  cotacoes: Map<string, Cotacao>,
  aporteDoMes: number,
): CarteiraArca {
  const porBalde = new Map<BaldeArca, number>();
  const fora = new Map<string, number>();

  for (const p of posicoes) {
    if (Number(p.quantidade_atual) <= 0) continue;
    const classe = classeDe(p.tipo);
    const valor = resumirAtivo(p, cotacoes).valorMercado;
    // Sem balde = fica fora do ARCA (hoje só o ouro, que não se rebalança).
    const balde = BALDE_DA_CLASSE[classe];
    if (!balde) {
      const rotulo = CLASSES_ATIVOS[classe].rotulo;
      fora.set(rotulo, (fora.get(rotulo) ?? 0) + valor);
      continue;
    }
    porBalde.set(balde, (porBalde.get(balde) ?? 0) + valor);
  }

  const total = [...porBalde.values()].reduce((s, v) => s + v, 0);
  const alvoEmReais = total * ALVO;

  const fatias: FatiaArca[] = BALDES.map((b) => {
    const valor = porBalde.get(b.chave) ?? 0;
    return {
      ...b,
      valor,
      percentual: total > 0 ? (valor / total) * 100 : 0,
      falta: Math.max(0, alvoEmReais - valor),
      excesso: Math.max(0, valor - alvoEmReais),
    };
  });

  // Metade da soma dos desvios é o que teria de mudar de lugar pra zerar tudo:
  // 100 menos isso é o quanto do caminho já está andado.
  const desvio = fatias.reduce((s, f) => s + Math.abs(f.percentual - ALVO * 100), 0) / 2;
  const equilibrio = Math.max(0, Math.round(100 - desvio));

  // Aporte repartido entre as atrasadas, na proporção do que falta em cada uma
  // — nenhum centavo vai pra letra que já passou dos 25%.
  const faltaTotal = fatias.reduce((s, f) => s + f.falta, 0);
  const reparticao = fatias
    .filter((f) => f.falta > 0)
    .map((f) => ({
      chave: f.chave,
      letra: f.letra,
      nome: f.nome,
      cor: f.cor,
      valor: faltaTotal > 0 ? Math.round((f.falta / faltaTotal) * aporteDoMes) : 0,
    }))
    .filter((r) => r.valor > 0);

  return {
    fatias,
    total,
    equilibrio,
    fora: {
      valor: [...fora.values()].reduce((s, v) => s + v, 0),
      itens: [...fora.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor),
    },
    reparticao,
  };
}
