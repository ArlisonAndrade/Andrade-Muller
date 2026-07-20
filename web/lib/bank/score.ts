import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";

// Score de saúde financeira 0–100: 4 pilares × 25 pts.
// orçamento (aderência 50/30/20 do mês) + dívida (em dia, progresso,
// adiantamentos) + aporte (investido no mês vs plano do ano) + reserva
// (meses de gasto essencial cobertos pelo saldo em conta).

export type PilarScore = {
  chave: "orcamento" | "divida" | "aporte" | "reserva";
  rotulo: string;
  pontos: number; // 0–25
  dica: string;
};

export type ScoreSaudeFinanceira = {
  total: number; // 0–100
  pilares: PilarScore[];
  maiorAlavanca: PilarScore;
};

const ALVOS_GRUPO: Record<string, number> = {
  essencial_50: 0.5,
  liberdade_30: 0.3,
  investimento_20: 0.2,
};

export async function calcularScoreSaude(
  supabase: SupabaseClient,
): Promise<ScoreSaudeFinanceira> {
  const hoje = new Date();
  const inicioMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)
    .toISOString()
    .slice(0, 10);
  const hojeISO = hoje.toISOString().slice(0, 10);

  const [
    { data: transacoes3M },
    { data: dividas },
    { data: parcelas },
    { data: comprasMes },
    { data: plano },
    { data: contas },
  ] = await Promise.all([
    supabase
      .from("transacoes")
      .select("valor, data, categoria:categorias(tipo, grupo_orcamento)")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .gte("data", tresMesesAtras),
    supabase.from("dividas").select("id, valor_total, valor_pago").eq("quitada", false),
    supabase
      .from("parcelas_divida")
      .select("divida_id, paga, adiantada, data_vencimento"),
    supabase
      .from("movimentacoes_ativos")
      .select("quantidade, preco_unitario, tipo")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("tipo", "compra")
      .gte("data", inicioMes),
    supabase
      .from("plano_patrimonio")
      .select("aporte_planejado")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ano", hoje.getFullYear())
      .maybeSingle(),
    supabase.from("contas").select("saldo_inicial").eq("entidade_id", ENTIDADE_FAMILIA),
  ]);

  type T = { valor: number; data: string; categoria: { tipo: string; grupo_orcamento: string | null } | null };
  const lista = (transacoes3M ?? []) as unknown as T[];
  const doMes = lista.filter((t) => t.data >= inicioMes);

  // ---------- Pilar 1: orçamento 50/30/20 ----------
  const receitasMes = doMes
    .filter((t) => t.categoria?.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  let pontosOrcamento: number;
  let dicaOrcamento: string;
  if (receitasMes <= 0) {
    pontosOrcamento = 12;
    dicaOrcamento = "Lance as receitas do mês pra medir a aderência ao 50/30/20.";
  } else {
    const frações: number[] = [];
    let piorGrupo = "";
    let piorEstouro = 0;
    for (const [grupo, pct] of Object.entries(ALVOS_GRUPO)) {
      const gasto = doMes
        .filter((t) => t.categoria?.tipo === "despesa" && t.categoria?.grupo_orcamento === grupo)
        .reduce((s, t) => s + Number(t.valor), 0);
      const alvo = receitasMes * pct;
      if (grupo === "investimento_20") continue; // aporte tem pilar próprio
      const fracao = gasto <= alvo ? 1 : alvo / Math.max(gasto, 0.01);
      frações.push(fracao);
      const estouro = gasto - alvo;
      if (estouro > piorEstouro) {
        piorEstouro = estouro;
        piorGrupo = grupo === "essencial_50" ? "essenciais" : "estilo de vida";
      }
    }
    const media = frações.length ? frações.reduce((s, f) => s + f, 0) / frações.length : 1;
    pontosOrcamento = Math.round(media * 25);
    dicaOrcamento =
      pontosOrcamento >= 25
        ? "Orçamento dentro do 50/30/20 — segura assim."
        : `Gastos de ${piorGrupo} estouraram o alvo do mês em R$ ${piorEstouro.toFixed(0)} — é a maior alavanca do orçamento.`;
  }

  // ---------- Pilar 2: dívida ----------
  const abertas = dividas ?? [];
  let pontosDivida: number;
  let dicaDivida: string;
  if (abertas.length === 0) {
    pontosDivida = 25;
    dicaDivida = "Sem dívidas em aberto. 🏆";
  } else {
    const idsAbertas = new Set(abertas.map((d) => d.id));
    const parcelasAbertas = (parcelas ?? []).filter((p) => idsAbertas.has(p.divida_id));
    const vencidas = parcelasAbertas.filter((p) => !p.paga && p.data_vencimento < hojeISO).length;
    const adiantadas = parcelasAbertas.filter((p) => p.paga && p.adiantada).length;
    const totalDividas = abertas.reduce((s, d) => s + Number(d.valor_total), 0);
    const pagoDividas = abertas.reduce((s, d) => s + Number(d.valor_pago), 0);
    const progresso = totalDividas > 0 ? pagoDividas / totalDividas : 0;

    const pontosEmDia = vencidas === 0 ? 12 : Math.max(0, 12 - vencidas * 4);
    const pontosProgresso = Math.round(progresso * 8);
    const pontosAdiantamento = Math.min(5, adiantadas);
    pontosDivida = pontosEmDia + pontosProgresso + pontosAdiantamento;
    dicaDivida =
      vencidas > 0
        ? `${vencidas} parcela(s) vencida(s) — colocar em dia é o ganho mais rápido de score.`
        : `Adiante 1 parcela do fim do cronograma e ganhe +1 pt (${adiantadas}/5 usados) além dos juros economizados.`;
  }

  // ---------- Pilar 3: aporte ----------
  const aporteMes = (comprasMes ?? []).reduce(
    (s, m) => s + Number(m.quantidade) * Number(m.preco_unitario),
    0,
  );
  const aporteAnual = Number(plano?.aporte_planejado ?? 0);
  const alvoMensal = aporteAnual > 0 ? aporteAnual / 12 : null;
  let pontosAporte: number;
  let dicaAporte: string;
  if (alvoMensal == null) {
    pontosAporte = aporteMes > 0 ? 20 : 10;
    dicaAporte = "Defina o aporte do ano na página Plano pra calibrar este pilar.";
  } else {
    pontosAporte = Math.round(Math.min(1, aporteMes / alvoMensal) * 25);
    dicaAporte =
      pontosAporte >= 25
        ? "Aporte do mês batido — o plano dos R$ 6M agradece."
        : `Faltam R$ ${(alvoMensal - aporteMes).toFixed(0)} de aporte pra bater o alvo do mês (${
            aporteMes > 0 ? `R$ ${aporteMes.toFixed(0)} já investidos` : "nenhum aporte ainda"
          }).`;
  }

  // ---------- Pilar 4: reserva ----------
  const saldo = (contas ?? []).reduce((s, c) => s + Number(c.saldo_inicial), 0);
  const essencial3M = lista
    .filter((t) => t.categoria?.tipo === "despesa" && t.categoria?.grupo_orcamento === "essencial_50")
    .reduce((s, t) => s + Number(t.valor), 0);
  const mediaEssencial = essencial3M / 3;
  let pontosReserva: number;
  let dicaReserva: string;
  if (mediaEssencial <= 0) {
    pontosReserva = 12;
    dicaReserva = "Lance os gastos essenciais pra medir quantos meses de reserva você tem.";
  } else {
    const meses = saldo / mediaEssencial;
    pontosReserva = Math.round(Math.min(1, meses / 6) * 25);
    dicaReserva =
      pontosReserva >= 25
        ? "6+ meses de reserva de emergência. Sólido."
        : `Reserva cobre ${meses.toFixed(1)} mês(es) de essenciais — a meta são 6.`;
  }

  const pilares: PilarScore[] = [
    { chave: "orcamento", rotulo: "Orçamento", pontos: pontosOrcamento, dica: dicaOrcamento },
    { chave: "divida", rotulo: "Dívida", pontos: pontosDivida, dica: dicaDivida },
    { chave: "aporte", rotulo: "Aporte", pontos: pontosAporte, dica: dicaAporte },
    { chave: "reserva", rotulo: "Reserva", pontos: pontosReserva, dica: dicaReserva },
  ];
  const maiorAlavanca = [...pilares].sort((a, b) => a.pontos - b.pontos)[0];

  return {
    total: pilares.reduce((s, p) => s + p.pontos, 0),
    pilares,
    maiorAlavanca,
  };
}
