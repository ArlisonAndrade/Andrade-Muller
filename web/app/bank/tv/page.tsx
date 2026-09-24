import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { moedaBRL } from "@/lib/bank/formato";
import { rotuloMes, rotuloValor } from "@/lib/bank/plano";
import { ROTULO_FINALIDADE, COR_FINALIDADE } from "@/lib/bank/classes-ativos";
import {
  balancoDoTrimestre,
  montarTrimestre,
  rotuloTrimestre,
  trimestrePadrao,
  trimestreVizinho,
  type ItemBalanco,
} from "@/lib/bank/trimestre";
import type { EstadoConquista } from "@/lib/bank/conquistas";
import { BigStat } from "@/components/bank/tv/big-stat";
import { Apresentacao, type SlideTv } from "@/components/bank/tv/apresentacao";
import { RevelacaoConquistas } from "@/components/bank/tv/revelacao-conquistas";
import { CompromissosReuniao } from "@/components/bank/tv/compromissos-reuniao";
import { Medalha } from "@/components/bank/conquistas/medalha";
import { SeloHistoriaDesenho } from "@/components/bank/conquistas/selo-historia";
import { JornadaPatrimonio } from "@/components/bank/home/jornada-patrimonio";
import { ConfeteAoEntrar } from "@/components/bank/tv/confete-ao-entrar";

export const metadata = { title: "Modo TV" };

const FUNDO = {
  capa: "radial-gradient(circle at 20% 20%, #1e3a5f 0%, #0b1220 60%, #000 100%)",
  jornada: "linear-gradient(135deg, #0f172a 0%, #020617 100%)",
  numeros: "linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%)",
  aportes: "linear-gradient(135deg, #15803d 0%, #052e16 100%)",
  carteira: "linear-gradient(135deg, #0e7490 0%, #083344 100%)",
  divida: "linear-gradient(135deg, #b91c1c 0%, #450a0a 100%)",
  semanas: "linear-gradient(135deg, #0f6e56 0%, #073d31 100%)",
  arthur: "linear-gradient(135deg, #3b5b74 0%, #14232e 100%)",
  conquistas: "linear-gradient(135deg, #b45309 0%, #451a03 100%)",
  escada: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
  proximo: "linear-gradient(135deg, #7c3aed 0%, #2e1065 100%)",
  compromissos: "linear-gradient(135deg, #1f2937 0%, #030712 100%)",
  certos: "linear-gradient(135deg, #16a34a 0%, #064e3b 100%)",
  ajustes: "linear-gradient(135deg, #334155 0%, #0f172a 100%)",
  futuro: "radial-gradient(circle at 80% 20%, #f59e0b 0%, #7c2d12 45%, #0c0a09 100%)",
};

// Trilha do gasto semanal: da média do trimestre anterior até a meta, com o
// trimestre atual marcado no meio. Mostra tendência, não só o número do tri.
function CaminhoMetaSemanal({
  anterior,
  atual,
  meta,
  rotuloAnterior,
  rotuloAtual,
}: {
  anterior: number;
  atual: number;
  meta: number;
  rotuloAnterior: string;
  rotuloAtual: string;
}) {
  const queda = anterior - atual;
  const chegou = atual <= meta;
  const pct = anterior > meta ? Math.min(100, Math.max(0, (queda / (anterior - meta)) * 100)) : chegou ? 100 : 0;
  const falta = atual - meta;

  let frase: string;
  if (chegou) frase = `Meta alcançada: ${brl0(atual)} por semana, abaixo dos ${brl0(meta)}. 🎉`;
  else if (queda > 0)
    frase = `Já andamos ${Math.round(pct)}% do caminho: faltam ${brl0(falta)} por semana pra chegar na média de ${brl0(meta)}.`;
  else frase = `A média subiu ${brl0(-queda)} por semana. Faltam ${brl0(falta)} pra chegar na média de ${brl0(meta)}.`;

  return (
    <div className="rounded-[20px] bg-white/10 p-6 sm:p-8" style={{ animation: "fade-slide-in 0.5s ease-out both" }}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-white/70 sm:text-base">Rumo aos {brl0(meta)} por semana</p>
        {queda > 0 && (
          <p className="text-2xl font-bold text-emerald-300 numeros-tabulares sm:text-3xl">
            ↓ {brl0(queda)} por semana
            <span className="ml-2 text-base font-medium text-white/70">
              ({Math.round((queda / anterior) * 100)}% a menos que no {rotuloAnterior})
            </span>
          </p>
        )}
      </div>

      <div className="relative mt-12 mb-14 h-3 rounded-full bg-white/15">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-400"
          style={{ width: `${pct}%`, transition: "width 1.2s ease-out" }}
        />
        <Marco posicao={0} titulo={rotuloAnterior} valor={brl0(anterior)} />
        <Marco posicao={pct} titulo={rotuloAtual} valor={brl0(atual)} destaque />
        <Marco posicao={100} titulo="Meta" valor={brl0(meta)} alvo />
      </div>

      <p className="text-xl text-white/90 sm:text-2xl">{frase}</p>
    </div>
  );
}

function Marco({
  posicao,
  titulo,
  valor,
  destaque = false,
  alvo = false,
}: {
  posicao: number;
  titulo: string;
  valor: string;
  destaque?: boolean;
  alvo?: boolean;
}) {
  const alinhamento = posicao <= 5 ? "items-start" : posicao >= 95 ? "items-end" : "items-center";
  const deslocamento = posicao <= 5 ? "0%" : posicao >= 95 ? "-100%" : "-50%";
  return (
    <div
      className={`absolute top-1/2 flex flex-col ${alinhamento}`}
      style={{ left: `${posicao}%`, transform: `translate(${deslocamento}, -50%)` }}
    >
      <p className={`absolute bottom-full mb-3 whitespace-nowrap text-sm ${destaque ? "font-semibold text-white" : "text-white/70"}`}>
        {titulo}
      </p>
      <span
        className={`block rounded-full border-2 ${
          destaque ? "h-7 w-7 border-white bg-emerald-400 shadow-lg" : alvo ? "h-5 w-5 border-white bg-white/20" : "h-5 w-5 border-white/60 bg-white/30"
        }`}
      >
        {alvo && <span className="flex h-full items-center justify-center text-[10px]">🎯</span>}
      </span>
      <p
        className={`absolute top-full mt-3 whitespace-nowrap numeros-tabulares ${
          destaque ? "text-xl font-bold text-white" : "text-base text-white/80"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function ListaBalanco({ itens, vazio }: { itens: ItemBalanco[]; vazio: string }) {
  if (itens.length === 0) return <p className="text-2xl text-white/80">{vazio}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {itens.map((i, n) => (
        <li
          key={n}
          className="flex gap-4 rounded-[18px] bg-white/10 px-5 py-4"
          style={{ animation: "fade-slide-in 0.4s ease-out both", animationDelay: `${n * 120}ms` }}
        >
          <span className="text-3xl" aria-hidden>
            {i.emoji}
          </span>
          <div>
            <p className="text-2xl">{i.texto}</p>
            {i.proximoPasso && <p className="mt-1 text-lg text-white/70">→ {i.proximoPasso}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const mesDeISO = (iso: string) => Number(iso.slice(0, 4)) * 100 + Number(iso.slice(5, 7));
const paraCelebrar = (lista: EstadoConquista[]) =>
  lista.map(({ codigo, emoji, nivel, nome, frase, selo, tom }) => ({ codigo, emoji, nivel, nome, frase, selo, tom }));

// Modo TV único (decisão do Arlison, 17/set/2026): a apresentação da reunião
// trimestral pra família, em tela cheia, conduzida com passador. Substitui o
// Modo TV antigo (resumo das abas, com o patrimônio de fluxo de caixa) e o
// /bank/tv/trimestre, que agora redireciona pra cá.
//
// Roteiro: de onde viemos → o trimestre → pra onde vamos → o que combinamos.
// Jornada e conquistas são um slide cada (sem revelar por partes).
export default async function PaginaModoTv({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const trimestre = t && /^\d{4}-T[1-4]$/.test(t) ? t : trimestrePadrao();
  const supabase = await createClient();
  const d = await montarTrimestre(supabase, trimestre);
  const { plano } = d;

  const crescimento = d.carteiraInicio != null ? d.carteiraFim - d.carteiraInicio : null;
  const crescimentoPct = d.carteiraInicio ? (crescimento! / d.carteiraInicio) * 100 : null;
  const cumpriuAportes = d.planejadoTotal > 0 && d.aportadoTotal >= d.planejadoTotal - 1;
  const fimSantander = d.historia.find((h) => h.codigo === "historia_fim_santander");
  const conquistasSlide = [...d.conquistasDoTrimestre, ...d.colecaoAnterior];
  const balanco = balancoDoTrimestre(d);
  const selosConquistados = d.historia.filter((h) => h.conquistada).length;
  const degrausAlcancados = plano.marcos.filter((m) => m.atingido).length;

  const slides: SlideTv[] = [
    {
      titulo: "Capa",
      emoji: "📺",
      fundo: FUNDO.capa,
      capa: true,
      conteudo: (
        <div className="flex flex-col gap-4">
          <p className="text-lg uppercase tracking-[0.3em] text-white/60">Andrade Muller</p>
          <h1 className="text-5xl font-semibold leading-tight sm:text-7xl">{rotuloTrimestre(trimestre)}</h1>
          <p className="text-xl text-white/70">
            Reunião de alinhamento financeiro da família
            {d.fechado ? "" : " · trimestre ainda em andamento"}
          </p>
          <div className="flex items-center gap-3 text-base text-white/70">
            <Link href={`/bank/tv?t=${trimestreVizinho(trimestre, -1)}`} className="rounded-full border border-white/25 px-3 py-1 hover:text-white">
              ‹ {rotuloTrimestre(trimestreVizinho(trimestre, -1))}
            </Link>
            <Link href={`/bank/tv?t=${trimestreVizinho(trimestre, 1)}`} className="rounded-full border border-white/25 px-3 py-1 hover:text-white">
              {rotuloTrimestre(trimestreVizinho(trimestre, 1))} ›
            </Link>
          </div>
        </div>
      ),
    },
    {
      titulo: "A jornada",
      emoji: "📈",
      fundo: FUNDO.jornada,
      conteudo: (
        <div className="rounded-[20px] bg-white p-4 text-text-primary sm:p-6">
          <JornadaPatrimonio jornada={d.jornada} />
        </div>
      ),
    },
    {
      titulo: "O trimestre em números",
      emoji: "📅",
      fundo: FUNDO.numeros,
      conteudo: (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <BigStat rotulo="Carteira no início" valor={d.carteiraInicio != null ? moedaBRL(d.carteiraInicio) : "—"} />
          <BigStat rotulo={d.fechado ? "Carteira no fim" : "Carteira hoje"} valor={moedaBRL(d.carteiraFim)} />
          <BigStat
            rotulo="No trimestre"
            valor={crescimento != null ? `${crescimento >= 0 ? "+" : ""}${brl0(crescimento)}` : "—"}
            apoio={crescimentoPct != null ? pct(crescimentoPct) : undefined}
            cor={crescimento != null && crescimento >= 0 ? "#86efac" : "#fca5a5"}
          />
        </div>
      ),
    },
    {
      titulo: "O que deu certo",
      emoji: "✅",
      fundo: FUNDO.certos,
      conteudo: <ListaBalanco itens={balanco.certos} vazio="Vocês estão aqui, olhando os números juntos. Isso já é o começo." />,
    },
    {
      titulo: "Os aportes",
      emoji: "💵",
      fundo: FUNDO.aportes,
      conteudo: (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {d.aportes.map((a) => {
              const cumpriu = a.planejado != null && a.realizado != null && a.realizado >= a.planejado - 1;
              return (
                <div key={a.mes} className="rounded-[18px] bg-white/10 p-5">
                  <p className="text-base uppercase tracking-wide text-white/70">{rotuloMes(a.mes)}</p>
                  <p className="mt-1 text-4xl font-bold numeros-tabulares">
                    {a.realizado != null ? brl0(Math.max(0, a.realizado)) : "—"}
                  </p>
                  <p className="mt-1 text-base text-white/70">
                    {a.reorganizacao
                      ? a.planejado != null
                        ? "reorganização"
                        : "antes do marco zero"
                      : `plano: ${brl0(a.planejado ?? 0)}${a.realizado != null ? (cumpriu ? " · ✓" : " · abaixo") : ""}`}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <BigStat
              rotulo="Aportado no trimestre"
              valor={brl0(d.aportadoTotal)}
              apoio={d.planejadoTotal > 0 ? `plano: ${brl0(d.planejadoTotal)}` : "trimestre de reorganização"}
              cor={cumpriuAportes ? "#86efac" : "#ffffff"}
            />
            <BigStat
              rotulo="Sequência"
              valor={plano.sequencia > 0 ? `🔥 ${plano.sequencia} ${plano.sequencia === 1 ? "mês" : "meses"}` : "—"}
              apoio={plano.antesDoPlacar ? `o placar começa em ${rotuloMes(plano.parametros.inicioPlacar)}` : "meses seguidos com o aporte cumprido"}
            />
          </div>
        </div>
      ),
    },
    {
      titulo: "A carteira",
      emoji: "🧺",
      fundo: FUNDO.carteira,
      conteudo: (
        <div className="flex flex-col gap-8">
          <div>
            <BigStat rotulo="Carteira hoje" valor={moedaBRL(d.carteira.total)} />
            <div className="mt-4 flex h-5 w-full overflow-hidden rounded-full bg-white/10">
              {d.carteira.porFinalidade.map((f) => (
                <div key={f.finalidade} style={{ width: `${f.percentual}%`, background: COR_FINALIDADE[f.finalidade] }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-lg">
              {d.carteira.porFinalidade.map((f) => (
                <span key={f.finalidade} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: COR_FINALIDADE[f.finalidade] }} />
                  {ROTULO_FINALIDADE[f.finalidade]} · {brl0(f.valor)}{" "}
                  <span className="text-white/60">({f.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%)</span>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { titulo: "Maiores altas", lista: d.carteira.maioresAltas, cor: "text-emerald-300" },
              { titulo: "Maiores quedas", lista: d.carteira.maioresQuedas, cor: "text-red-300" },
            ].map((bloco) => (
              <div key={bloco.titulo} className="rounded-[18px] bg-white/10 p-5">
                <p className="mb-3 text-sm uppercase tracking-wide text-white/60">{bloco.titulo} · desde a compra</p>
                {bloco.lista.length === 0 && <p className="text-white/60">—</p>}
                {bloco.lista.map((a) => (
                  <p key={a.ativo_id} className="flex justify-between gap-4 py-1 text-xl">
                    <span className="truncate">{a.ticker}</span>
                    <span className={`numeros-tabulares ${bloco.cor}`}>{pct(a.rentabilidadePct ?? 0)}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      titulo: "A dívida",
      emoji: "🏦",
      fundo: FUNDO.divida,
      conteudo: (
        <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-center">
          {fimSantander?.selo && (
            <div className="flex flex-col items-center gap-2">
              <SeloHistoriaDesenho
                selo={fimSantander.selo}
                tamanho={200}
                bloqueado={!fimSantander.conquistada}
                progresso={fimSantander.progresso}
              />
              <p className="text-lg font-semibold">Fim do Santander</p>
            </div>
          )}
          <div className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-2">
            <BigStat rotulo="Parcelas pagas no trimestre" valor={String(d.divida.parcelasPagas)} />
            <BigStat
              rotulo="Adiantadas"
              valor={String(d.divida.adiantadas)}
              apoio={d.divida.jurosEconomizados > 0 ? `${brl0(d.divida.jurosEconomizados)} de juros cortados` : undefined}
              cor={d.divida.adiantadas > 0 ? "#86efac" : "#ffffff"}
            />
            <BigStat rotulo="Principal em aberto" valor={brl0(d.divida.saldoPrincipal)} />
            <BigStat
              rotulo="Quitação prevista"
              valor={d.divida.quitacaoPrevista ? rotuloMes(mesDeISO(d.divida.quitacaoPrevista)) : "✓ quitada"}
              apoio="cada parcela adiantada puxa essa data pra perto"
            />
          </div>
        </div>
      ),
    },
    {
      titulo: "As semanas",
      emoji: "🧾",
      fundo: FUNDO.semanas,
      conteudo: (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <BigStat
              rotulo="Semanas dentro da meta"
              valor={d.semanas.total > 0 ? `${d.semanas.dentro} de ${d.semanas.total}` : "—"}
              cor={d.semanas.total > 0 && d.semanas.dentro / d.semanas.total >= 0.5 ? "#86efac" : "#ffffff"}
            />
            <BigStat
              rotulo="Gasto médio por semana"
              valor={d.semanas.media != null ? brl0(d.semanas.media) : "—"}
              apoio={d.semanas.meta != null ? `meta: ${brl0(d.semanas.meta)}` : undefined}
              cor={
                d.semanas.media != null && d.semanas.mediaAnterior != null && d.semanas.media < d.semanas.mediaAnterior
                  ? "#86efac"
                  : undefined
              }
            />
            <BigStat
              rotulo="Categoria que mais pesou"
              valor={d.semanas.categoriaMaisPesou?.nome ?? "—"}
              apoio={d.semanas.categoriaMaisPesou ? `${brl0(d.semanas.categoriaMaisPesou.gasto)} no trimestre` : undefined}
            />
          </div>
          {d.semanas.media != null && d.semanas.mediaAnterior != null && d.semanas.meta != null && (
            <CaminhoMetaSemanal
              anterior={d.semanas.mediaAnterior}
              atual={d.semanas.media}
              meta={d.semanas.meta}
              rotuloAnterior={`${trimestreVizinho(d.trimestre, -1).slice(-1)}º tri`}
              rotuloAtual={`${d.trimestre.slice(-1)}º tri`}
            />
          )}
        </div>
      ),
    },
    {
      titulo: "Arthur",
      emoji: "👦",
      fundo: FUNDO.arthur,
      conteudo: (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <BigStat rotulo="Carteira do Arthur" valor={moedaBRL(d.arthur.atual)} />
          <BigStat
            rotulo="Da meta dele"
            valor={`${Math.round((d.arthur.atual / Math.max(1, d.arthur.meta)) * 100)}%`}
            apoio={`meta: ${brl0(d.arthur.meta)}`}
          />
        </div>
      ),
    },
    {
      titulo: "O que ajustar",
      emoji: "🔧",
      fundo: FUNDO.ajustes,
      conteudo: (
        <div className="flex flex-col gap-4">
          <p className="text-lg text-white/70">Não é sentença: cada ponto já vem com o próximo passo.</p>
          <ListaBalanco itens={balanco.ajustes} vazio="Nada ficou pra trás neste trimestre. 👏" />
        </div>
      ),
    },
    {
      titulo: "Conquistas do trimestre",
      emoji: "🏅",
      fundo: FUNDO.conquistas,
      conteudo: (
        <div className="flex flex-col gap-4">
          {d.primeiraReuniao && d.colecaoAnterior.length > 0 && (
            <p className="text-lg text-white/80">
              Primeira reunião: entram também as que vocês já tinham antes de o jogo começar.
            </p>
          )}
          <RevelacaoConquistas
            conquistas={paraCelebrar(conquistasSlide)}
            vazio="Nenhuma medalha nova neste trimestre — as que estão ao alcance aparecem logo adiante."
          />
        </div>
      ),
    },
    {
      titulo: "A escada",
      emoji: "🪜",
      fundo: FUNDO.escada,
      conteudo: (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <BigStat
              rotulo={`Fase ${plano.faseAtual.numero} · ${plano.faseAtual.nome}`}
              valor={`${plano.progressoFase.toLocaleString("pt-BR", { maximumFractionDigits: plano.progressoFase < 10 ? 1 : 0 })}%`}
              apoio={plano.faseAtual.numero === 1 ? `${brl0(plano.construidoDesdeMarcoZero)} desde o marco zero` : undefined}
            />
            <BigStat
              rotulo={plano.proximoMarco ? `Próximo degrau · ${rotuloValor(plano.proximoMarco.valor)}` : "Degraus"}
              valor={plano.proximoMarco ? `${Math.round(plano.proximoMarco.progresso)}%` : "✓ todos"}
              apoio={plano.proximoMarco?.mesPrevisto ? `no ritmo de hoje: ${rotuloMes(plano.proximoMarco.mesPrevisto)}` : undefined}
              cor="#c7d2fe"
            />
            <BigStat
              rotulo={`Meta · ${rotuloValor(plano.parametros.metaFinal)}`}
              valor={plano.mesDaMeta ? rotuloMes(plano.mesDaMeta) : "—"}
              apoio={`prazo: ${plano.parametros.anoMeta}`}
              cor={plano.mesDaMeta && plano.mesDaMeta <= plano.parametros.anoMeta * 100 + 12 ? "#86efac" : "#ffffff"}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {plano.marcos.map((m) => (
              <div key={m.valor} className={`rounded-[14px] px-4 py-3 text-center ${m.atingido ? "bg-emerald-400/25" : "bg-white/10"}`}>
                <p className="text-lg font-semibold">{rotuloValor(m.valor)}</p>
                <p className="text-sm text-white/70">{m.atingido ? "✓" : m.mesRitmo ? rotuloMes(m.mesRitmo) : "—"}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      titulo: `O ${rotuloTrimestre(d.proximo.trimestre)}`,
      emoji: "🧭",
      fundo: FUNDO.proximo,
      conteudo: (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <BigStat rotulo="O plano pede de aporte" valor={brl0(d.proximo.aporteTotal)} />
            <p className="text-lg text-white/70">
              {d.proximo.aportePorMes.map((a) => `${rotuloMes(a.mes)}: ${brl0(a.valor)}`).join(" · ")}
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-white/70">Medalhas ao alcance</p>
            <div className="flex flex-col gap-3">
              {d.proximo.alcance.length === 0 && <p className="text-white/70">—</p>}
              {d.proximo.alcance.map((e) => (
                <div key={e.codigo} className="flex items-center gap-4 rounded-[14px] bg-white/10 p-3">
                  <Medalha emoji={e.emoji} nivel={e.nivel} bloqueada tamanho={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-medium">{e.nome}</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-white" style={{ width: `${e.progresso}%` }} />
                    </div>
                  </div>
                  <span className="text-lg text-white/80 numeros-tabulares">{Math.round(e.progresso)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: "O que combinamos",
      emoji: "🤝",
      fundo: FUNDO.compromissos,
      conteudo: (
        <CompromissosReuniao
          trimestre={trimestre}
          trimestreAnterior={trimestreVizinho(trimestre, -1)}
          rotuloProximo={rotuloTrimestre(d.proximo.trimestre)}
          anteriores={d.compromissosAnteriores}
          iniciais={d.reuniao?.compromissos ?? []}
          notasIniciais={d.reuniao?.notas ?? ""}
          sugestoes={[
            `Aportar ${brl0(d.proximo.aportePorMes[0]?.valor ?? 0)} todo mês, logo que o salário cair`,
            "Adiantar 1 parcela do Santander",
            "Fechar as semanas dentro da meta",
          ]}
        />
      ),
    },
    {
      titulo: "O que está por vir",
      emoji: "🚀",
      fundo: FUNDO.futuro,
      conteudo: (
        <div className="relative flex flex-col gap-10">
          <ConfeteAoEntrar />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-[20px] bg-black/30 p-6">
              <p className="mb-4 text-sm uppercase tracking-[0.25em] text-white/60">Já conquistamos</p>
              <ul className="flex flex-col gap-3 text-2xl">
                <li>🧱 {brl0(plano.construidoDesdeMarcoZero)} construídos desde o marco zero</li>
                <li>💼 {moedaBRL(plano.patrimonioHoje)} de carteira</li>
                {degrausAlcancados > 0 && <li>🪜 {degrausAlcancados} {degrausAlcancados === 1 ? "degrau" : "degraus"} da escada</li>}
                {selosConquistados > 0 && <li>🧭 {selosConquistados} marcos da história</li>}
              </ul>
            </div>
            <div className="rounded-[20px] bg-black/30 p-6">
              <p className="mb-4 text-sm uppercase tracking-[0.25em] text-white/60">O que está por vir</p>
              <ul className="flex flex-col gap-3 text-2xl">
                {plano.proximoMarco?.mesPrevisto && (
                  <li>🌱 {rotuloValor(plano.proximoMarco.valor)} em {rotuloMes(plano.proximoMarco.mesPrevisto)}</li>
                )}
                {d.divida.quitacaoPrevista && <li>⛓️‍💥 Fim do Santander em {rotuloMes(mesDeISO(d.divida.quitacaoPrevista))}</li>}
                {plano.fases[1]?.ateMes && <li>🏡 R$ 1 milhão em {rotuloMes(plano.fases[1].ateMes)}</li>}
                {plano.mesDaMeta && (
                  <li>🏆 {rotuloValor(plano.parametros.metaFinal)} em {rotuloMes(plano.mesDaMeta)}</li>
                )}
              </ul>
            </div>
          </div>
          <p className="text-center text-4xl font-semibold sm:text-5xl">Um degrau de cada vez.</p>
        </div>
      ),
    },
  ];

  return <Apresentacao slides={slides} rodape={<span>{rotuloTrimestre(trimestre)}</span>} />;
}
