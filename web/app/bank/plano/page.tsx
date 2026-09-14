import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { moedaBRL } from "@/lib/bank/formato";
import { valorInvestido } from "@/lib/bank/calculos";
import {
  aaaammDe,
  aporteDoMes,
  carregarPlano,
  indiceMes,
  mesDoIndice,
  rotuloMes,
  rotuloValor,
} from "@/lib/bank/plano";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { GraficoPlano } from "@/components/bank/plano/grafico-plano";
import { GraficoAportes } from "@/components/bank/plano/grafico-aportes";
import { ParametrosPlanoForm } from "@/components/bank/plano/parametros-plano";
import { VitrineConquistas } from "@/components/bank/conquistas/vitrine";
import { CelebracaoConquistas } from "@/components/bank/conquistas/celebracao";
import { aoAlcance, avaliarConquistas, conquistasParaCelebrar } from "@/lib/bank/conquistas";

export const metadata = { title: "Plano" };

const EMOJI_MARCO: Record<number, string> = {
  100_000: "🌱",
  250_000: "🌿",
  500_000: "🌳",
  1_000_000: "🏡",
  2_000_000: "⛰️",
  3_000_000: "🚀",
};

const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Plano patrimonial — reescrito em 14/set/2026. O que mudou e por quê está em
// lib/bank/plano.ts. A página foi desenhada pra puxar pra frente: mostra a
// fase e o próximo degrau (perto, alcançável), o placar do aporte (que só
// depende da família) e deixa a meta final como horizonte, com data que anda.
export default async function PaginaPlano() {
  const supabase = await createClient();

  const [{ data: posicoes }, { data: cotacoes }, { data: fotos }, { data: ultimaSync }] = await Promise.all([
    supabase
      .from("posicao_ativos")
      .select("ativo_id, quantidade_atual, preco_medio")
      .eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual"),
    supabase
      .from("snapshots_patrimonio")
      .select("competencia, valor_mercado")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .order("competencia"),
    supabase
      .from("sincronizacoes_investidor10")
      .select("executado_em, ok")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ok", true)
      .order("executado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const mapaCotacoes = new Map((cotacoes ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]));
  const abertas = (posicoes ?? []).filter((p) => Number(p.quantidade_atual) > 0);
  const patrimonioHoje = valorInvestido(abertas, mapaCotacoes);
  const aplicadoHoje = abertas.reduce((s, p) => s + Number(p.quantidade_atual) * Number(p.preco_medio ?? 0), 0);

  const plano = await carregarPlano(supabase, { patrimonio: patrimonioHoje, aplicado: aplicadoHoje });
  // Avaliar antes de ler as pendentes: medalha nova já comemora nesta visita.
  const conquistas = await avaliarConquistas(supabase);
  const paraCelebrar = await conquistasParaCelebrar(supabase);
  const { parametros: p, hoje } = plano;
  const antesDoInicio = hoje < p.inicio;

  // Carteira real mês a mês (fotos mensais) + o valor vivo de hoje.
  const reais = (fotos ?? [])
    .map((f) => ({ mes: aaaammDe(String(f.competencia)), valor: Number(f.valor_mercado) }))
    .filter((r) => r.mes < hoje);
  reais.push({ mes: hoje, valor: patrimonioHoje });

  // Rampa do aporte: do início do plano até 1 ano depois de chegar no alvo.
  const realizadoPorMes = new Map(plano.aportes.map((a) => [a.mes, a.realizado]));
  const mesesAporte: Array<{ mes: number; planejado: number; realizado: number | null }> = [];
  for (let i = indiceMes(p.inicio); i <= indiceMes(p.rampaFim) + 12; i++) {
    const mes = mesDoIndice(i);
    mesesAporte.push({ mes, planejado: aporteDoMes(p, mes), realizado: realizadoPorMes.get(mes) ?? null });
  }

  const falta = plano.aporteDoMesAtual.planejado - plano.aporteDoMesAtual.realizado;
  const pctMeta = Math.min(100, (patrimonioHoje / p.metaFinal) * 100);
  const noPrazo = plano.mesDaMeta != null && plano.mesDaMeta <= p.anoMeta * 100 + 12;

  return (
    <div className="flex flex-col gap-6">
      <CelebracaoConquistas conquistas={paraCelebrar} />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Plano patrimonial</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Rumo a {rotuloValor(p.metaFinal)} até {p.anoMeta}, um degrau de cada vez.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
        <Link
          href="/bank/tv/trimestre"
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          📺 Reunião trimestral
        </Link>
        <p className="text-xs text-text-faint">
          Carteira do Investidor10
          {ultimaSync
            ? ` · atualizada em ${new Date(ultimaSync.executado_em).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : " · ainda não sincronizada"}
        </p>
        </div>
      </div>

      {/* Fase atual */}
      <section className="card-bank p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-bank-primaria">
              Fase {plano.faseAtual.numero} de 3 · {plano.faseAtual.nome}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{plano.faseAtual.descricao}</p>
            <div className="mt-4 flex items-baseline justify-between text-sm">
              <span className="text-text-secondary">
                {brl0(plano.faseAtual.valorInicio)} → {brl0(plano.faseAtual.valorAlvo)}
                {plano.faseAtual.ateMes && (
                  <span className="text-text-faint"> · plano: {rotuloMes(plano.faseAtual.ateMes)}</span>
                )}
              </span>
              <span className="text-xl font-semibold text-text-primary numeros-tabulares">
                {Math.round(plano.progressoFase)}%
              </span>
            </div>
            <ProgressBar percentual={plano.progressoFase} altura="h-3" className="mt-2" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {plano.fases.map((f) => (
                <div
                  key={f.numero}
                  className={`rounded-[8px] border px-2 py-1.5 text-center text-[11px] ${
                    f.numero === plano.faseAtual.numero
                      ? "border-bank-primaria bg-bank-primaria-bg text-bank-primaria"
                      : f.numero < plano.faseAtual.numero
                        ? "border-bank-positivo bg-bank-positivo-bg text-bank-positivo"
                        : "border-border text-text-faint"
                  }`}
                >
                  {f.numero < plano.faseAtual.numero ? "✓ " : ""}
                  {f.nome}
                  {f.ateMes && <span className="block opacity-80">{rotuloMes(f.ateMes)}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] bg-surface-2 p-4 lg:w-72">
            <p className="text-xs text-text-secondary">Carteira hoje</p>
            <p className="text-2xl font-semibold text-text-primary numeros-tabulares">{moedaBRL(patrimonioHoje)}</p>
            {antesDoInicio ? (
              <p className="mt-2 text-sm text-text-secondary">
                O plano começa em <strong className="text-text-primary">{rotuloMes(p.inicio)}</strong>. A linha de
                base é a carteira de hoje — dali pra frente, cada mês conta.
              </p>
            ) : plano.desvio >= 0 ? (
              <p className="mt-2 text-sm text-bank-positivo">
                <strong>{brl0(plano.desvio)} à frente</strong> do plano deste mês ({brl0(plano.planejadoHoje)}).
              </p>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">
                O plano deste mês é {brl0(plano.planejadoHoje)} — faltam{" "}
                <strong className="text-text-primary">{brl0(-plano.desvio)}</strong> pra voltar pra linha.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Placar: aporte · próximo degrau · meta */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <section className="card-bank p-4 sm:p-5">
          <p className="text-sm font-semibold">Aporte de {rotuloMes(Math.max(hoje, p.inicio))}</p>
          <p className="mt-2 text-2xl font-semibold numeros-tabulares">
            {brl0(plano.aporteDoMesAtual.realizado)}
            <span className="text-sm font-normal text-text-faint"> de {brl0(plano.aporteDoMesAtual.planejado)}</span>
          </p>
          <ProgressBar
            percentual={(plano.aporteDoMesAtual.realizado / Math.max(1, plano.aporteDoMesAtual.planejado)) * 100}
            cor="var(--color-bank-positivo)"
            className="mt-2"
          />
          <p className="mt-2 text-xs text-text-secondary">
            {antesDoInicio
              ? "Primeiro mês do plano. Registrou a compra no Investidor10, ela aparece aqui."
              : falta <= 1
                ? "✓ Aporte do mês cumprido."
                : `Faltam ${brl0(falta)}. Registrou a compra no Investidor10, ela aparece aqui.`}
          </p>
          <p className="mt-3 text-sm">
            {plano.sequencia > 0 ? (
              <span className="font-medium text-text-primary">🔥 {plano.sequencia} {plano.sequencia === 1 ? "mês" : "meses"} seguidos</span>
            ) : (
              <span className="text-text-faint">A sequência começa no primeiro mês cumprido.</span>
            )}
          </p>
        </section>

        <section className="card-bank p-4 sm:p-5">
          {plano.proximoMarco ? (
            <>
              <p className="text-sm font-semibold">
                Próximo degrau · {EMOJI_MARCO[plano.proximoMarco.valor] ?? "🏆"} {rotuloValor(plano.proximoMarco.valor)}
              </p>
              <p className="mt-2 text-2xl font-semibold numeros-tabulares">{Math.round(plano.proximoMarco.progresso)}%</p>
              <ProgressBar percentual={plano.proximoMarco.progresso} className="mt-2" />
              <p className="mt-2 text-xs text-text-secondary">
                Faltam {brl0(plano.proximoMarco.valor - patrimonioHoje)}
                {plano.proximoMarco.mesPrevisto && (
                  <>
                    {" "}· no ritmo de hoje, em{" "}
                    <strong className="text-bank-primaria">{rotuloMes(plano.proximoMarco.mesPrevisto)}</strong>
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold">🏆 Todos os degraus alcançados.</p>
          )}
        </section>

        <section className="card-bank p-4 sm:p-5">
          <p className="text-sm font-semibold">🏆 Meta · {rotuloValor(p.metaFinal)}</p>
          <p className="mt-2 text-2xl font-semibold numeros-tabulares">
            {pctMeta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </p>
          <ProgressBar percentual={pctMeta} cor="#f59e0b" className="mt-2" />
          <p className="mt-2 text-xs text-text-secondary">
            No ritmo de hoje, chega em{" "}
            <strong className={noPrazo ? "text-bank-positivo" : "text-text-primary"}>
              {plano.mesDaMeta ? rotuloMes(plano.mesDaMeta) : "depois do horizonte"}
            </strong>
            {noPrazo ? ` — dentro do prazo de ${p.anoMeta}.` : ` — o prazo é ${p.anoMeta}.`}
          </p>
        </section>
      </div>

      {/* Conquistas da família */}
      <section className="card-bank p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">🏅 Conquistas da família</h2>
        <VitrineConquistas estados={conquistas} alcance={aoAlcance(conquistas)} />
      </section>

      {/* Escada de marcos */}
      <section className="card-bank p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">A escada</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {plano.marcos.map((m) => {
            const proximo = plano.proximoMarco?.valor === m.valor;
            return (
              <div
                key={m.valor}
                className={`rounded-[10px] border p-3 text-center ${
                  m.atingido
                    ? "border-bank-positivo bg-bank-positivo-bg"
                    : proximo
                      ? "border-bank-primaria bg-bank-primaria-bg"
                      : "border-border bg-surface-1"
                }`}
              >
                <p className="text-lg leading-none" aria-hidden>
                  {EMOJI_MARCO[m.valor] ?? "🏆"}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-primary">{rotuloValor(m.valor)}</p>
                <p className={`mt-1 text-xs ${m.atingido ? "text-bank-positivo" : "text-text-secondary"}`}>
                  {m.atingido ? "✓ alcançado" : m.mesRitmo ? rotuloMes(m.mesRitmo) : "—"}
                </p>
                {!m.atingido && m.mesPlano && m.mesRitmo && m.mesPlano !== m.mesRitmo && (
                  <p className="text-[10px] text-text-faint">plano: {rotuloMes(m.mesPlano)}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Curva */}
      <section className="card-bank p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Plano × ritmo de hoje × carteira real</h2>
        <GraficoPlano curvaPlano={plano.curvaPlano} ritmoAtual={plano.ritmoAtual} reais={reais} hoje={hoje} />
      </section>

      {/* Rampa do aporte */}
      <section className="card-bank p-4 sm:p-5">
        <h2 className="text-sm font-semibold">A rampa do aporte</h2>
        <p className="mb-2 text-xs text-text-secondary">
          De {brl0(p.aporteInicial)} em {rotuloMes(p.inicio)} até {brl0(p.aporteAlvo)} em {rotuloMes(p.rampaFim)}, depois
          +{p.reajusteAa}% ao ano. O aporte realizado é o quanto o valor aplicado no Investidor10 cresceu no mês.
        </p>
        <GraficoAportes meses={mesesAporte} />
      </section>

      {/* Parâmetros */}
      <details className="card-bank p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold">Ajustar o plano</summary>
        <div className="mt-4">
          <ParametrosPlanoForm entidadeId={ENTIDADE_FAMILIA} parametros={p} patrimonioHoje={patrimonioHoje} hoje={hoje} />
        </div>
      </details>
    </div>
  );
}
