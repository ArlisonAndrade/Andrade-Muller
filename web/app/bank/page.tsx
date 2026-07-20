import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EstadoSemConfiguracao } from "@/components/bank/home/estado-sem-configuracao";
import { SeletorEntidade } from "@/components/bank/ui/seletor-entidade";
import { CardMetrica } from "@/components/bank/ui/card-metrica";
import { PonteProLabore } from "@/components/bank/home/ponte-pro-labore";
import { Orcamento503020 } from "@/components/bank/home/orcamento-503020";
import { CarteiraArthur } from "@/components/bank/home/carteira-arthur";
import { MetasAtivas } from "@/components/bank/home/metas-ativas";
import { DividasAtivas } from "@/components/bank/home/dividas-ativas";
import { TransacoesRecentes } from "@/components/bank/home/transacoes-recentes";
import { ProximasContas, type ContaProxima } from "@/components/bank/home/proximas-contas";
import { ScoreSaude } from "@/components/bank/home/score-saude";
import { calcularScoreSaude } from "@/lib/bank/score";
import { EvolucaoPatrimonio } from "@/components/bank/investimentos/evolucao-patrimonio";
import { DonutAlocacao } from "@/components/bank/investimentos/donut-alocacao";
import { patrimonio, valorInvestido } from "@/lib/bank/calculos";
import { agregarPorClasse, type Cotacao, type PosicaoDetalhada } from "@/lib/bank/calculos-investimentos";
import { CLASSES_ATIVOS } from "@/lib/bank/classes-ativos";
import { gerarRecorrenciasPendentes } from "@/lib/bank/acoes/recorrencias";
import { garantirSnapshotDoMes } from "@/lib/bank/acoes/investimentos";
import {
  IconPigMoney,
  IconChartPie,
  IconTrendingUp,
  IconTrendingDown,
} from "@/components/bank/ui/icones";
import { moedaBRL } from "@/lib/bank/formato";
import {
  ENTIDADE_FAMILIA,
  ENTIDADE_ARTHUR,
  ENTIDADE_CONSULTORIA,
  type VisaoEntidade,
  type Transacao,
} from "@/lib/bank/tipos";

function supabaseConfigurado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes("SEU-PROJETO");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  if (!supabaseConfigurado()) {
    return <EstadoSemConfiguracao />;
  }

  const { visao: visaoParam } = await searchParams;
  const visao: VisaoEntidade = visaoParam === "familia" ? "familia" : "consolidado";

  // Materializa recorrências e a foto mensal antes das queries (idempotentes).
  await gerarRecorrenciasPendentes();
  await garantirSnapshotDoMes();

  // O CNPJ não é uma visão do Bank — a vida financeira da consultoria fica só no
  // FM Gestão. "Consolidado" = Família + Carteira Arthur; "Família" = só a Família.
  const entidadesDaVisao =
    visao === "familia" ? [ENTIDADE_FAMILIA] : [ENTIDADE_FAMILIA, ENTIDADE_ARTHUR];

  const hoje = new Date();
  const inicioMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const dozeMesesAtras = new Date();
  dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);
  const corte12M = dozeMesesAtras.toISOString().slice(0, 10);

  const supabase = await createClient();

  const [
    { data: contas },
    { data: transacoes },
    { data: cartoesFamilia },
    { data: posicoes },
    { data: cotacoesRaw },
    { data: contasArthur },
    { data: transacoesArthur },
    { data: posicoesArthur },
    { data: metas },
    { data: dividas },
    { data: metasAlocacao },
    { data: snapshots },
    { data: recorrencias },
  ] = await Promise.all([
    supabase.from("contas").select("id, entidade_id, saldo_inicial").in("entidade_id", entidadesDaVisao),
    supabase
      .from("transacoes")
      .select("id, entidade_id, descricao, valor, data, transacao_vinculada_id, categoria:categorias(nome, tipo, grupo_orcamento)")
      .in("entidade_id", entidadesDaVisao)
      .order("data", { ascending: false }),
    supabase.from("cartoes").select("id, nome").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual, variacao_dia_pct"),
    supabase.from("contas").select("id, saldo_inicial").eq("entidade_id", ENTIDADE_ARTHUR),
    supabase.from("transacoes").select("valor, categoria:categorias(tipo)").eq("entidade_id", ENTIDADE_ARTHUR),
    supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_ARTHUR),
    supabase.from("metas").select("*").eq("status", "em_andamento").in("entidade_id", entidadesDaVisao),
    supabase
      .from("dividas")
      .select("id, descricao, valor_total, valor_pago, parcelas_total, parcelas_pagas, data_vencimento_proxima")
      .eq("quitada", false)
      .in("entidade_id", entidadesDaVisao),
    supabase.from("metas_alocacao").select("classe, percentual_alvo").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase
      .from("snapshots_patrimonio")
      .select("entidade_id, competencia, valor_aplicado, valor_mercado")
      .in("entidade_id", entidadesDaVisao)
      .gte("competencia", corte12M)
      .order("competencia"),
    supabase
      .from("recorrencias")
      .select("descricao, valor, dia_do_mes, categoria:categorias(nome)")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ativa", true),
  ]);

  // Score de saúde financeira (sempre baseado na Família).
  const score = await calcularScoreSaude(supabase);

  const cotacoesMap = new Map(
    (cotacoesRaw ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]),
  );
  const transacoesTyped = (transacoes ?? []) as unknown as Transacao[];

  const valorPatrimonio = patrimonio(contas ?? [], transacoesTyped, posicoes ?? [], cotacoesMap);
  const patrimonioArthur = patrimonio(
    contasArthur ?? [],
    (transacoesArthur ?? []) as unknown as Transacao[],
    posicoesArthur ?? [],
    cotacoesMap,
  );
  const investidoFamilia = valorInvestido(posicoes ?? [], cotacoesMap);

  // Alocação por classe (pro donut) + variação do dia ponderada.
  const mapaCotacoesDetalhe = new Map<string, Cotacao>(
    (cotacoesRaw ?? []).map((c) => [
      c.ativo_id,
      { preco_atual: c.preco_atual, variacao_dia_pct: c.variacao_dia_pct },
    ]),
  );
  const classes = agregarPorClasse(
    (posicoes ?? []) as PosicaoDetalhada[],
    mapaCotacoesDetalhe,
    new Map((metasAlocacao ?? []).map((m) => [m.classe, Number(m.percentual_alvo)])),
  );
  const classesComVariacao = classes.filter((c) => c.variacaoDiaPct != null && c.valorMercado > 0);
  const pesoVariacao = classesComVariacao.reduce((s, c) => s + c.valorMercado, 0);
  const variacaoDia =
    pesoVariacao > 0
      ? classesComVariacao.reduce((s, c) => s + (c.variacaoDiaPct as number) * c.valorMercado, 0) /
        pesoVariacao
      : undefined;

  // ---------- Mês corrente (receitas, despesas, orçamento 50/30/20) ----------
  const doMes = transacoesTyped.filter(
    (t) => t.data >= inicioMes && t.entidade_id === ENTIDADE_FAMILIA,
  );
  const receitasMes = doMes
    .filter((t) => t.categoria?.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  const despesasMes = doMes
    .filter((t) => t.categoria?.tipo === "despesa")
    .reduce((s, t) => s + Number(t.valor), 0);
  const gastoPorGrupo: Record<string, number> = {};
  for (const t of doMes) {
    if (t.categoria?.tipo !== "despesa" || !t.categoria?.grupo_orcamento) continue;
    const chave = t.categoria.grupo_orcamento;
    gastoPorGrupo[chave] = (gastoPorGrupo[chave] ?? 0) + Number(t.valor);
  }

  // ---------- Próximas contas (recorrências + fatura + dívida) ----------
  const proximas: ContaProxima[] = [];
  const diaHoje = hoje.getDate();
  for (const r of (recorrencias ?? []) as unknown as Array<{
    descricao: string;
    valor: number;
    dia_do_mes: number;
    categoria: { nome: string } | null;
  }>) {
    // Já venceu neste mês → mostra a ocorrência do mês que vem.
    const base = new Date(hoje.getFullYear(), hoje.getMonth() + (r.dia_do_mes <= diaHoje ? 1 : 0), r.dia_do_mes);
    proximas.push({
      rotulo: r.descricao,
      detalhe: r.categoria?.nome ?? "recorrência",
      valor: Number(r.valor),
      data: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`,
    });
  }
  const idsCartoesFamilia = (cartoesFamilia ?? []).map((c) => c.id);
  if (idsCartoesFamilia.length > 0) {
    const { data: fatura } = await supabase
      .from("faturas_cartao")
      .select("competencia, valor_total, cartao:cartoes(nome)")
      .in("cartao_id", idsCartoesFamilia)
      .eq("paga", false)
      .order("competencia", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fatura) {
      const f = fatura as unknown as {
        competencia: string;
        valor_total: number | null;
        cartao: { nome: string } | null;
      };
      proximas.push({
        rotulo: `Fatura ${f.cartao?.nome ?? "cartão"}`,
        detalhe: "fatura em aberto",
        valor: f.valor_total != null ? Number(f.valor_total) : null,
        data: String(f.competencia),
      });
    }
  }
  for (const d of dividas ?? []) {
    if (d.data_vencimento_proxima) {
      proximas.push({
        rotulo: d.descricao,
        detalhe: `parcela ${(d.parcelas_pagas ?? 0) + 1}${d.parcelas_total ? `/${d.parcelas_total}` : ""}`,
        valor: null,
        data: String(d.data_vencimento_proxima),
      });
    }
  }

  // ---------- Ponte pró-labore ----------
  const { data: pontesData } = await supabase
    .from("transacoes")
    .select("id, descricao, valor, data")
    .eq("entidade_id", ENTIDADE_CONSULTORIA)
    .not("transacao_vinculada_id", "is", null)
    .order("data", { ascending: false })
    .limit(5);

  // ---------- Evolução consolidada (soma dos snapshots por competência) ----------
  const evolucao = new Map<string, { aplicado: number; mercado: number }>();
  for (const s of snapshots ?? []) {
    const chave = String(s.competencia);
    const atual = evolucao.get(chave) ?? { aplicado: 0, mercado: 0 };
    atual.aplicado += Number(s.valor_aplicado);
    atual.mercado += Number(s.valor_mercado);
    evolucao.set(chave, atual);
  }
  const pontosEvolucao = [...evolucao.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([competencia, v]) => ({
      competencia,
      valorAplicado: v.aplicado,
      ganho: v.mercado - v.aplicado,
    }));

  const saldoMes = receitasMes - despesasMes;

  return (
    <div className="flex flex-col gap-6">
      <SeletorEntidade visaoAtual={visao} />

      {/* Métricas do topo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica
          label={visao === "familia" ? "Patrimônio da Família" : "Patrimônio consolidado"}
          valor={moedaBRL(valorPatrimonio)}
          icone={<IconPigMoney size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Investimentos"
          valor={moedaBRL(investidoFamilia)}
          variacaoPct={variacaoDia}
          apoio={
            <Link href="/bank/investimentos" className="text-bank-primaria underline">
              ver carteira
            </Link>
          }
          icone={<IconChartPie size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Receitas do mês"
          valor={moedaBRL(receitasMes)}
          corValor="text-bank-positivo"
          icone={<IconTrendingUp size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Despesas do mês"
          valor={moedaBRL(despesasMes)}
          corValor="text-bank-negativo"
          apoio={
            <>
              Saldo{" "}
              <span className={saldoMes >= 0 ? "text-bank-positivo" : "text-bank-negativo"}>
                {moedaBRL(saldoMes)}
              </span>
            </>
          }
          icone={<IconTrendingDown size={18} stroke={1.7} />}
        />
      </div>

      {/* Evolução + alocação */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card-bank p-4 sm:p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Evolução do patrimônio investido</h2>
            <Link href="/bank/investimentos" className="text-xs text-bank-primaria underline">
              detalhes
            </Link>
          </div>
          <EvolucaoPatrimonio pontos={pontosEvolucao} />
        </section>
        <section className="card-bank p-4 sm:p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Alocação</h2>
            <Link href="/bank/investimentos" className="text-xs text-bank-primaria underline">
              metas
            </Link>
          </div>
          {classes.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-faint">
              Sem posições ainda —{" "}
              <Link href="/bank/investimentos/novo" className="text-bank-primaria underline">
                registrar a primeira compra
              </Link>
              .
            </p>
          ) : (
            <DonutAlocacao
              fatias={classes.map((c) => ({
                rotulo: CLASSES_ATIVOS[c.classe].rotuloCurto,
                valor: c.valorMercado,
                cor: CLASSES_ATIVOS[c.classe].cor,
              }))}
            />
          )}
        </section>
      </div>

      {/* Grade de módulos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreSaude score={score} />
        {visao === "familia" && (
          <Orcamento503020 totalReceita={receitasMes} gastoPorGrupo={gastoPorGrupo} />
        )}
        <ProximasContas contas={proximas} />
        <CarteiraArthur patrimonio={patrimonioArthur} posicoes={posicoesArthur ?? []} />
        <DividasAtivas dividas={dividas ?? []} />
        <MetasAtivas metas={metas ?? []} />
        <PonteProLabore pontes={pontesData ?? []} />
        <TransacoesRecentes transacoes={transacoesTyped.slice(0, 8)} />
      </div>
    </div>
  );
}
