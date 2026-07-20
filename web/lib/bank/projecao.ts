// Projeção de patrimônio com juros compostos mensais — usada pelo
// simulador do plano R$ 6M e pela Carteira Arthur (client e server).

export type PontoProjecao = { ano: number; valor: number };

export function projetarPatrimonio(
  valorInicial: number,
  aporteMensal: number,
  rentabilidadeAnualPct: number,
  anoInicial: number,
  anoFinal: number,
): PontoProjecao[] {
  const taxaMensal = Math.pow(1 + rentabilidadeAnualPct / 100, 1 / 12) - 1;
  const pontos: PontoProjecao[] = [];
  let valor = valorInicial;
  for (let ano = anoInicial; ano <= anoFinal; ano++) {
    for (let m = 0; m < 12; m++) {
      valor = valor * (1 + taxaMensal) + aporteMensal;
    }
    pontos.push({ ano, valor: Math.round(valor * 100) / 100 });
  }
  return pontos;
}

// Primeiro ano em que a projeção cruza um marco (ou null se não cruza).
export function anoDoMarco(pontos: PontoProjecao[], marco: number): number | null {
  for (const p of pontos) {
    if (p.valor >= marco) return p.ano;
  }
  return null;
}

export const MARCOS_PLANO = [100_000, 500_000, 1_000_000, 3_000_000, 6_000_000];
