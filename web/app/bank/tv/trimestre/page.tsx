import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { moedaBRL } from "@/lib/bank/formato";
import { rotuloMes, rotuloValor } from "@/lib/bank/plano";
import {
  montarTrimestre,
  rotuloTrimestre,
  trimestrePadrao,
  trimestreVizinho,
} from "@/lib/bank/trimestre";
import type { EstadoConquista } from "@/lib/bank/conquistas";
import { BigStat } from "@/components/bank/tv/big-stat";
import { TvSlideshow, type SlideTv } from "@/components/bank/tv/tv-slideshow";
import { RevelacaoConquistas } from "@/components/bank/tv/revelacao-conquistas";
import { CompromissosReuniao } from "@/components/bank/tv/compromissos-reuniao";
import { Medalha } from "@/components/bank/conquistas/medalha";
import { LinhaHistoria } from "@/components/bank/conquistas/linha-historia";

export const metadata = { title: "Reunião trimestral" };

const FUNDO = {
  abertura: "linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%)",
  aportes: "linear-gradient(135deg, #15803d 0%, #052e16 100%)",
  conquistas: "linear-gradient(135deg, #b45309 0%, #451a03 100%)",
  escada: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
  divida: "linear-gradient(135deg, #b91c1c 0%, #450a0a 100%)",
  semanas: "linear-gradient(135deg, #0f6e56 0%, #073d31 100%)",
  arthur: "linear-gradient(135deg, #3b5b74 0%, #14232e 100%)",
  proximo: "linear-gradient(135deg, #7c3aed 0%, #2e1065 100%)",
};

const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const paraCelebrar = (lista: EstadoConquista[]) =>
  lista.map(({ codigo, emoji, nivel, nome, frase }) => ({ codigo, emoji, nivel, nome, frase }));

// Reunião trimestral de alinhamento financeiro — Modo TV com roteiro fixo:
// abrir com o resultado, comemorar as conquistas, olhar a escada, e fechar
// combinando o próximo trimestre (salvo, pra próxima reunião conferir).
export default async function PaginaReuniaoTrimestral({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const trimestre = t && /^\d{4}-T[1-4]$/.test(t) ? t : trimestrePadrao();
  const supabase = await createClient();
  const d = await montarTrimestre(supabase, trimestre);
  const { plano } = d;

  const crescimento = d.carteiraInicio != null ? d.carteiraFim - d.carteiraInicio : null;
  const crescimentoPct = d.carteiraInicio ? (crescimento! / d.carteiraInicio) * 100 : null;
  const cumpriuAportes = d.planejadoTotal > 0 && d.aportadoTotal >= d.planejadoTotal - 1;

  const slides: SlideTv[] = [
    // Toda reunião abre lembrando o caminho — decisão do Arlison.
    ...(d.historia.length > 0
      ? [
          {
            titulo: "De onde viemos",
            emoji: "🧭",
            fundo: "linear-gradient(135deg, #18181b 0%, #000000 100%)",
            conteudo: <LinhaHistoria selos={d.historia} escuro tamanho={132} />,
          } satisfies SlideTv,
        ]
      : []),
    {
      titulo: rotuloTrimestre(trimestre),
      emoji: "📅",
      fundo: FUNDO.abertura,
      conteudo: (
        <div className="flex flex-col gap-8">
          <p className="text-lg text-white/80">
            Reunião de alinhamento financeiro da família Andrade Muller
            {d.fechado ? "" : " · trimestre ainda em andamento"}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <BigStat rotulo="Carteira no início" valor={d.carteiraInicio != null ? moedaBRL(d.carteiraInicio) : "—"} />
            <BigStat rotulo={d.fechado ? "Carteira no fim" : "Carteira hoje"} valor={moedaBRL(d.carteiraFim)} />
            <BigStat
              rotulo="No trimestre"
              valor={crescimento != null ? `${crescimento >= 0 ? "+" : ""}${brl0(crescimento)}` : "—"}
              apoio={crescimentoPct != null ? pct(crescimentoPct) : undefined}
              cor={crescimento != null && crescimento >= 0 ? "#86efac" : "#fca5a5"}
            />
          </div>
        </div>
      ),
    },
    {
      titulo: "Os aportes",
      emoji: "💵",
      fundo: FUNDO.aportes,
      conteudo: (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {d.aportes.map((a) => {
              const cumpriu = a.planejado != null && a.realizado != null && a.realizado >= a.planejado - 1;
              return (
                <div key={a.mes} className="rounded-[16px] bg-white/10 p-4">
                  <p className="text-sm uppercase tracking-wide text-white/70">{rotuloMes(a.mes)}</p>
                  <p className="mt-1 text-3xl font-bold text-white numeros-tabulares">
                    {a.realizado != null ? brl0(Math.max(0, a.realizado)) : "—"}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {a.reorganizacao
                      ? a.planejado != null
                        ? "reorganização · depois da negociação com o BB"
                        : "antes do marco zero"
                      : `plano: ${brl0(a.planejado ?? 0)}${a.realizado != null ? (cumpriu ? " · ✓" : " · abaixo") : ""}`}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <BigStat
              rotulo="Aportado no trimestre"
              valor={brl0(d.aportadoTotal)}
              apoio={d.planejadoTotal > 0 ? `plano: ${brl0(d.planejadoTotal)}` : undefined}
              cor={cumpriuAportes ? "#86efac" : "#ffffff"}
            />
            <BigStat
              rotulo="Sequência"
              valor={plano.sequencia > 0 ? `🔥 ${plano.sequencia} ${plano.sequencia === 1 ? "mês" : "meses"}` : "—"}
              apoio="meses seguidos com o aporte cumprido"
            />
          </div>
        </div>
      ),
    },
    {
      titulo: "Conquistas do trimestre",
      emoji: "🏅",
      fundo: FUNDO.conquistas,
      conteudo: (
        <RevelacaoConquistas
          conquistas={paraCelebrar(d.conquistasDoTrimestre)}
          vazio="Nenhuma medalha nova neste trimestre — as que estão ao alcance aparecem no fim da reunião."
        />
      ),
    },
    ...(d.primeiraReuniao && d.colecaoAnterior.length > 0
      ? [
          {
            titulo: "A coleção até aqui",
            emoji: "🗃️",
            fundo: FUNDO.conquistas,
            conteudo: (
              <div className="flex flex-col gap-4">
                <p className="text-lg text-white/80">
                  Primeira reunião — estas vocês já tinham conquistado antes de o jogo começar.
                </p>
                <RevelacaoConquistas conquistas={paraCelebrar(d.colecaoAnterior)} vazio="" />
              </div>
            ),
          } satisfies SlideTv,
        ]
      : []),
    {
      titulo: "A escada",
      emoji: "🪜",
      fundo: FUNDO.escada,
      conteudo: (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <BigStat
              rotulo={`Fase ${plano.faseAtual.numero} · ${plano.faseAtual.nome}`}
              valor={`${Math.round(plano.progressoFase)}%`}
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
              <div
                key={m.valor}
                className={`rounded-[12px] px-3 py-2 text-center ${m.atingido ? "bg-emerald-400/25" : "bg-white/10"}`}
              >
                <p className="text-sm font-semibold text-white">{rotuloValor(m.valor)}</p>
                <p className="text-xs text-white/70">{m.atingido ? "✓" : m.mesRitmo ? rotuloMes(m.mesRitmo) : "—"}</p>
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
            valor={d.divida.quitacaoPrevista ? rotuloMes(Number(d.divida.quitacaoPrevista.slice(0, 4)) * 100 + Number(d.divida.quitacaoPrevista.slice(5, 7))) : "✓ quitada"}
            apoio="cada parcela adiantada puxa essa data pra perto"
          />
        </div>
      ),
    },
    {
      titulo: "As semanas",
      emoji: "🧾",
      fundo: FUNDO.semanas,
      conteudo: (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <BigStat
            rotulo="Semanas dentro da meta"
            valor={d.semanas.total > 0 ? `${d.semanas.dentro} de ${d.semanas.total}` : "—"}
            cor={d.semanas.total > 0 && d.semanas.dentro / d.semanas.total >= 0.5 ? "#86efac" : "#ffffff"}
          />
          <BigStat
            rotulo="Gasto médio por semana"
            valor={d.semanas.media != null ? brl0(d.semanas.media) : "—"}
            apoio={d.semanas.meta != null ? `meta: ${brl0(d.semanas.meta)}` : undefined}
          />
        </div>
      ),
    },
    {
      titulo: "Arthur",
      emoji: "👦",
      fundo: FUNDO.arthur,
      conteudo: (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
      titulo: `O ${rotuloTrimestre(d.proximo.trimestre)}`,
      emoji: "🧭",
      fundo: FUNDO.proximo,
      conteudo: (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <BigStat rotulo="O plano pede de aporte" valor={brl0(d.proximo.aporteTotal)} />
              <p className="text-sm text-white/70">
                {d.proximo.aportePorMes.map((a) => `${rotuloMes(a.mes)}: ${brl0(a.valor)}`).join(" · ")}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wide text-white/70">Medalhas ao alcance</p>
              <div className="flex flex-col gap-2">
                {d.proximo.alcance.length === 0 && <p className="text-white/70">—</p>}
                {d.proximo.alcance.map((e) => (
                  <div key={e.codigo} className="flex items-center gap-3 rounded-[12px] bg-white/10 p-2">
                    <Medalha emoji={e.emoji} nivel={e.nivel} bloqueada tamanho={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{e.nome}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full rounded-full bg-white" style={{ width: `${e.progresso}%` }} />
                      </div>
                    </div>
                    <span className="text-sm text-white/80 numeros-tabulares">{Math.round(e.progresso)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
        </div>
      ),
    },
  ];

  return (
    <TvSlideshow
      slides={slides}
      cabecalho={
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Link href={`/bank/tv/trimestre?t=${trimestreVizinho(trimestre, -1)}`} className="rounded-full border border-border px-2 py-0.5 hover:text-text-primary">
            ‹
          </Link>
          <span className="min-w-36 text-center">{rotuloTrimestre(trimestre)}</span>
          <Link href={`/bank/tv/trimestre?t=${trimestreVizinho(trimestre, 1)}`} className="rounded-full border border-border px-2 py-0.5 hover:text-text-primary">
            ›
          </Link>
        </div>
      }
    />
  );
}
