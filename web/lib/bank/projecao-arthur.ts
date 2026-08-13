const NASCIMENTO_ARTHUR = "2022-10-30";

// Projeção do nascimento até a idade-alvo: aporte mensal + aporte extra no
// mês do aniversário. Cada ponto é uma idade do Arthur. Extraída do
// simulador (client) pra poder rodar também no server — é o que vira a
// "meta" da carteira do Arthur em /bank/investimentos, sempre em sincronia
// com os sliders salvos em /bank/arthur (mesma fonte, sem duplicar lógica).
export type PontoArthur = { idade: number; valor: number };

export function projetarArthur(
  patrimonioAtual: number,
  aporteMensalInicial: number,
  aporteAniversarioInicial: number,
  rentabilidadeAnual: number,
  idadeAlvo: number,
  crescimentoAporteAnualPct = 0,
): PontoArthur[] {
  const nasc = new Date(NASCIMENTO_ARTHUR);
  const hoje = new Date();
  const idadeAtual = (hoje.getTime() - nasc.getTime()) / (365.25 * 24 * 3600 * 1000);
  const taxaMensal = Math.pow(1 + rentabilidadeAnual / 100, 1 / 12) - 1;
  const fatorCrescimento = 1 + crescimentoAporteAnualPct / 100;

  const pontos: PontoArthur[] = [];
  let valor = patrimonioAtual;
  let aporteMensal = aporteMensalInicial;
  let aporteAniversario = aporteAniversarioInicial;
  // Começa da idade atual (arredondada pra baixo) e avança mês a mês.
  const mesesRestantes = Math.max(0, Math.round((idadeAlvo - idadeAtual) * 12));
  let mesGlobal = Math.floor(idadeAtual * 12);
  for (let k = 0; k < mesesRestantes; k++) {
    valor = valor * (1 + taxaMensal) + aporteMensal;
    mesGlobal++;
    // Mês do aniversário (mês 0 do ciclo de 12 a partir do nascimento em out).
    if (mesGlobal % 12 === 0) {
      valor += aporteAniversario;
      pontos.push({ idade: Math.round(mesGlobal / 12), valor: Math.round(valor * 100) / 100 });
      // Reajusta os aportes pro próximo ano — ex. 5%/ano acompanhando um aumento salarial.
      aporteMensal *= fatorCrescimento;
      aporteAniversario *= fatorCrescimento;
    }
  }
  // Garante o ponto final na idade-alvo.
  if (pontos.length === 0 || pontos[pontos.length - 1].idade < idadeAlvo) {
    pontos.push({ idade: idadeAlvo, valor: Math.round(valor * 100) / 100 });
  }
  return pontos;
}
