import { createClient } from "@/lib/supabase/server";
import {
  ENTIDADE_FAMILIA,
  PRESETS_DIVISAO,
  type DivisaoConfig,
  type Pessoa,
  type Transacao,
} from "@/lib/bank/tipos";
import { moedaBRL } from "@/lib/bank/formato";
import { patrimonio, valorInvestido } from "@/lib/bank/calculos";
import { calcularScoreSaude } from "@/lib/bank/score";
import { montarPanoramaSemanal } from "@/lib/bank/semanas";
import {
  agregarPorClasse,
  agruparPorFinalidade,
  type Cotacao,
  type PosicaoDetalhada,
} from "@/lib/bank/calculos-investimentos";
import { ROTULO_FINALIDADE, COR_FINALIDADE } from "@/lib/bank/classes-ativos";
import { obterPatrimonioArthur, obterMetaArthur } from "@/lib/bank/arthur";
import { projetarPatrimonio, anoDoMarco } from "@/lib/bank/projecao";
import { faseAtual, statusDaFase, ROTULO_STATUS_FASE, EMOJI_STATUS_FASE } from "@/lib/bank/plano-arthur";
import { BigStat } from "@/components/bank/tv/big-stat";
import { TvSlideshow, type SlideTv } from "@/components/bank/tv/tv-slideshow";

export const metadata = { title: "Modo TV" };

// Gradientes por slide — só decoração, não tokens do design system (o
// Modo TV é uma exceção: precisa ser vistoso de longe, os cards normais
// do Bank continuam planos/brancos).
const FUNDO = {
  inicio: "linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%)",
  planejamento: "linear-gradient(135deg, #0f6e56 0%, #073d31 100%)",
  semanas: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
  investimentos: "linear-gradient(135deg, #15803d 0%, #052e16 100%)",
  dividas: "linear-gradient(135deg, #b91c1c 0%, #450a0a 100%)",
  planoUsd: "linear-gradient(135deg, #b45309 0%, #451a03 100%)",
  arthur: "linear-gradient(135deg, #3b5b74 0%, #14232e 100%)",
};

// Modo TV — slideshow com o resumo de cada aba, pra deixar ligado numa
// TV/monitor. Avanço é só manual (seta do teclado, clique nos botões ou
// nos pontinhos) — decisão do Arlison, sem troca automática. Cada slide
// busca só o essencial das mesmas fontes das páginas reais, então nunca
// diverge dos números de lá.
export default async function PaginaTv() {
  const supabase = await createClient();
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const inicioMes = `${anoAtual}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    { data: contas },
    { data: transacoesTodas },
    { data: transacoesMes },
    { data: posicoes },
    { data: cotacoesRaw },
    { data: pessoas },
    { data: itensOrcamento },
    { data: configRaw },
    { data: dividas },
    { data: curvaPlano },
    { data: parametrosPlano },
  ] = await Promise.all([
    supabase.from("contas").select("id, saldo_inicial").eq("entidade_id", ENTIDADE_FAMILIA),
    // Histórico completo — o cálculo de patrimônio (saldo + fluxo de caixa)
    // precisa de todas as transações, não só do mês, senão o patrimônio
    // sai errado (bug encontrado em 14/ago/2026: mostrava só o fluxo do
    // mês como se fosse o patrimônio inteiro).
    supabase
      .from("transacoes")
      .select("valor, data, categoria:categorias(tipo)")
      .eq("entidade_id", ENTIDADE_FAMILIA),
    supabase
      .from("transacoes")
      .select("valor, data, categoria:categorias(tipo)")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .gte("data", inicioMes),
    supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual, variacao_dia_pct"),
    supabase
      .from("pessoas")
      .select("id, entidade_id, nome, cor, renda_base, ordem, ativo")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("orcamento_planejado")
      .select("valor, responsavel_id")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ativo", true),
    supabase.from("divisao_orcamento_config").select("*").eq("entidade_id", ENTIDADE_FAMILIA).maybeSingle(),
    supabase.from("dividas").select("valor_total, valor_pago, quitada").eq("quitada", false),
    supabase
      .from("plano_patrimonio")
      .select("ano, valor_alvo")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .order("ano"),
    supabase.from("parametros_plano").select("chave, valor").eq("entidade_id", ENTIDADE_FAMILIA),
  ]);

  const score = await calcularScoreSaude(supabase);
  const panorama = await montarPanoramaSemanal(supabase, ENTIDADE_FAMILIA);

  const cotacoesMap = new Map((cotacoesRaw ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]));
  const cotacoesDetalhe = new Map<string, Cotacao>(
    (cotacoesRaw ?? []).map((c) => [c.ativo_id, { preco_atual: c.preco_atual, variacao_dia_pct: c.variacao_dia_pct }]),
  );

  // ---------- Início ----------
  const patrimonioFamilia = patrimonio(contas ?? [], (transacoesTodas ?? []) as unknown as Transacao[], posicoes ?? [], cotacoesMap);
  const investidoFamilia = valorInvestido(posicoes ?? [], cotacoesMap);
  const transacoesTipadas = (transacoesMes ?? []) as unknown as { valor: number; categoria: { tipo: string } | null }[];
  const receitasMes = transacoesTipadas.filter((t) => t.categoria?.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
  const despesasMes = transacoesTipadas.filter((t) => t.categoria?.tipo === "despesa").reduce((s, t) => s + Number(t.valor), 0);

  // ---------- Planejamento ----------
  const listaPessoas = (pessoas ?? []) as Pessoa[];
  const rendaTotal = listaPessoas.reduce((s, p) => s + Number(p.renda_base), 0);
  const config: DivisaoConfig = configRaw ?? {
    entidade_id: ENTIDADE_FAMILIA,
    preset: "50_30_20",
    pct_essencial: 50,
    pct_liberdade: 30,
    pct_investimento: 20,
    pct_extra: 0,
    extra_nome: null,
  };
  const presetAtivo = PRESETS_DIVISAO.find((p) => p.valor === config.preset);
  const nomeDivisao = presetAtivo?.nome ?? "Personalizada";
  const itensPorPessoa = new Map<string, number>();
  for (const i of itensOrcamento ?? []) {
    if (!i.responsavel_id) continue;
    itensPorPessoa.set(i.responsavel_id, (itensPorPessoa.get(i.responsavel_id) ?? 0) + Number(i.valor));
  }

  // ---------- Investimentos ----------
  const classes = agregarPorClasse((posicoes ?? []) as PosicaoDetalhada[], cotacoesDetalhe, new Map());
  const valorAplicado = classes.reduce((s, c) => s + c.valorAplicado, 0);
  const valorMercado = classes.reduce((s, c) => s + c.valorMercado, 0);
  const gruposFinalidade = agruparPorFinalidade(classes);

  // ---------- Dívidas ----------
  const dividasAbertas = dividas ?? [];
  const totalEmAberto = dividasAbertas.reduce((s, d) => s + (Number(d.valor_total) - Number(d.valor_pago)), 0);
  const totalJaPago = dividasAbertas.reduce((s, d) => s + Number(d.valor_pago), 0);

  // ---------- Plano US$ 1 milhão ----------
  const paramsPlano = new Map((parametrosPlano ?? []).map((p) => [p.chave, Number(p.valor)]));
  const aporteMensalPlano = paramsPlano.get("plano6m_aporte_mensal") ?? 1000;
  const rentabilidadePlano = paramsPlano.get("plano6m_rentabilidade_aa") ?? 12;
  const crescimentoPlano = paramsPlano.get("plano6m_crescimento_aporte_aa") ?? 10;
  const alvoAno = (curvaPlano ?? []).find((c) => c.ano === anoAtual);
  const posicaoVsPlano =
    alvoAno && Number(alvoAno.valor_alvo) > 0 ? (patrimonioFamilia / Number(alvoAno.valor_alvo) - 1) * 100 : null;
  const simulacaoPlano = projetarPatrimonio(patrimonioFamilia, aporteMensalPlano, rentabilidadePlano, anoAtual, anoAtual + 30, crescimentoPlano);
  const ano6M = anoDoMarco(simulacaoPlano, 6_000_000);

  // ---------- Arthur ----------
  const { atual: patrimonioArthur } = await obterPatrimonioArthur(supabase, cotacoesMap);
  const metaArthur = obterMetaArthur();
  const nascimentoArthur = new Date("2022-10-30");
  const idadeArthurExata = (hoje.getTime() - nascimentoArthur.getTime()) / (365.25 * 24 * 3600 * 1000);
  const idadeArthurAnos = Math.floor(idadeArthurExata);
  const faseArthurAtual = faseAtual(idadeArthurExata);
  const statusFaseArthur = statusDaFase(faseArthurAtual, idadeArthurExata, patrimonioArthur);

  const slides: SlideTv[] = [
    {
      titulo: "Início",
      emoji: "🏠",
      fundo: FUNDO.inicio,
      conteudo: (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <BigStat rotulo="Patrimônio da família" valor={moedaBRL(patrimonioFamilia)} />
          <BigStat rotulo="Investimentos" valor={moedaBRL(investidoFamilia)} />
          <BigStat rotulo="Receitas do mês" valor={moedaBRL(receitasMes)} cor="#86efac" />
          <BigStat rotulo="Despesas do mês" valor={moedaBRL(despesasMes)} cor="#fca5a5" />
          <BigStat
            rotulo="Score de saúde"
            valor={`${score.total}/100`}
            apoio={`maior alavanca: ${score.maiorAlavanca.rotulo}`}
          />
        </div>
      ),
    },
    {
      titulo: "Planejamento",
      emoji: "📋",
      fundo: FUNDO.planejamento,
      conteudo: (
        <div className="flex flex-col gap-6">
          <BigStat rotulo="Renda total da família" valor={moedaBRL(rendaTotal)} apoio={`divisão: ${nomeDivisao}`} />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {listaPessoas.map((p) => (
              <BigStat key={p.id} rotulo={p.nome} valor={moedaBRL(itensPorPessoa.get(p.id) ?? 0)} apoio="paga por mês" />
            ))}
          </div>
        </div>
      ),
    },
    {
      titulo: "Semanas",
      emoji: "🗓️",
      fundo: FUNDO.semanas,
      conteudo: (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <BigStat
            rotulo={panorama.atual.rotulo}
            valor={moedaBRL(panorama.atual.gasto)}
            apoio={panorama.atual.meta != null ? `de ${moedaBRL(panorama.atual.meta)}` : "sem meta"}
          />
          <BigStat
            rotulo="Projeção da semana"
            valor={panorama.atual.projecao != null ? moedaBRL(panorama.atual.projecao) : "—"}
          />
          <BigStat rotulo="Sequência dentro da meta" valor={`${panorama.streak} semana(s)`} />
          <BigStat
            rotulo="Normal das semanas fechadas"
            valor={panorama.mediaHistorica != null ? moedaBRL(panorama.mediaHistorica) : "—"}
          />
        </div>
      ),
    },
    {
      titulo: "Investimentos",
      emoji: "📈",
      fundo: FUNDO.investimentos,
      conteudo: (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <BigStat rotulo="Patrimônio investido" valor={moedaBRL(valorMercado)} />
            <BigStat rotulo="Lucro (ganho de capital)" valor={moedaBRL(valorMercado - valorAplicado)} cor="#86efac" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {gruposFinalidade.map((g) => (
              <BigStat
                key={g.finalidade}
                rotulo={ROTULO_FINALIDADE[g.finalidade]}
                valor={moedaBRL(g.valorMercado)}
                cor={COR_FINALIDADE[g.finalidade]}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      titulo: "Dívidas",
      emoji: "💳",
      fundo: FUNDO.dividas,
      conteudo:
        dividasAbertas.length === 0 ? (
          <BigStat rotulo="Dívidas em aberto" valor="Nenhuma 🎉" />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <BigStat rotulo="Falta pagar" valor={moedaBRL(totalEmAberto)} />
            <BigStat rotulo="Já pago" valor={moedaBRL(totalJaPago)} cor="#86efac" />
            <BigStat rotulo="Dívidas em aberto" valor={String(dividasAbertas.length)} />
          </div>
        ),
    },
    {
      titulo: "US$ 1 milhão",
      emoji: "🚀",
      fundo: FUNDO.planoUsd,
      conteudo: (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <BigStat rotulo="Patrimônio hoje" valor={moedaBRL(patrimonioFamilia)} />
          <BigStat rotulo={`Alvo do plano (${anoAtual})`} valor={alvoAno ? moedaBRL(Number(alvoAno.valor_alvo)) : "—"} />
          <BigStat
            rotulo="Você está"
            valor={posicaoVsPlano != null ? `${posicaoVsPlano >= 0 ? "+" : ""}${posicaoVsPlano.toFixed(1)}%` : "—"}
            cor={posicaoVsPlano != null && posicaoVsPlano >= 0 ? "#86efac" : "#fca5a5"}
          />
          <BigStat rotulo="R$ 6 milhões chegam em" valor={ano6M ? String(ano6M) : "—"} />
        </div>
      ),
    },
    {
      titulo: "Arthur",
      emoji: "🧒",
      fundo: FUNDO.arthur,
      conteudo: (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <BigStat rotulo="Patrimônio hoje" valor={moedaBRL(patrimonioArthur)} apoio={`${idadeArthurAnos} anos`} />
          <BigStat rotulo="Meta aos 20 anos" valor={moedaBRL(metaArthur)} />
          <BigStat
            rotulo={`Fase ${faseArthurAtual.numero} · ${faseArthurAtual.nome}`}
            valor={`${EMOJI_STATUS_FASE[statusFaseArthur]} ${ROTULO_STATUS_FASE[statusFaseArthur]}`}
          />
        </div>
      ),
    },
  ];

  return <TvSlideshow slides={slides} />;
}
