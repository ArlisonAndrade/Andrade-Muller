import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA, type FormaPagamento } from "@/lib/bank/tipos";
import { moedaBRL, dataBR, ROTULO_FORMA } from "@/lib/bank/formato";
import { montarPanoramaSemanal } from "@/lib/bank/semanas";
import { segundaDaSemana } from "@/lib/bank/agente/datas";
import { CardMetrica } from "@/components/bank/ui/card-metrica";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { MetaEditavel } from "@/components/bank/semanas/meta-editavel";
import { PlanoCategorias } from "@/components/bank/semanas/plano-categorias";
import { ListaSemanas } from "@/components/bank/semanas/lista-semanas";
import { IconTarget, IconCalendarEvent, IconTrendingUp } from "@/components/bank/ui/icones";
import { LinhaTransacao } from "@/components/bank/lancamentos/linha-transacao";

export const metadata = { title: "Semanas" };

// O controle semanal no site do que o consultor do Telegram alimenta todo
// dia. A semana 01 do modelo novo é a de 27/jul/2026 — antes disso não há
// registro semanal, por decisão (o histórico da planilha não foi arrastado).
export default async function PaginaSemanas({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana: semanaParam } = await searchParams;
  const supabase = await createClient();

  // Permite abrir uma semana passada pela URL sem virar navegação complexa.
  const hoje = /^\d{4}-\d{2}-\d{2}$/.test(semanaParam ?? "")
    ? segundaDaSemana(semanaParam as string)
    : undefined;

  const panorama = await montarPanoramaSemanal(supabase, ENTIDADE_FAMILIA, { hoje });
  const { atual, anteriores, mediaHistorica, streak } = panorama;

  const [{ data: transacoesSemana }, { data: categorias }, { data: cartoes }] = await Promise.all([
    supabase
      .from("transacoes")
      .select(
        "id, descricao, valor, data, categoria_id, forma_pagamento, cartao_id, recorrencia_id, categoria:categorias(nome, tipo)",
      )
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .gte("data", atual.inicio)
      .lte("data", atual.fim)
      .order("data", { ascending: false })
      .order("id", { ascending: false }),
    supabase.from("categorias").select("id, nome, tipo").eq("entidade_id", ENTIDADE_FAMILIA).order("nome"),
    supabase.from("cartoes").select("id, nome").eq("entidade_id", ENTIDADE_FAMILIA).order("nome"),
  ]);

  type TransacaoSemana = {
    id: string;
    descricao: string;
    valor: number;
    data: string;
    categoria_id: string | null;
    forma_pagamento: FormaPagamento | null;
    cartao_id: string | null;
    recorrencia_id: string | null;
    categoria: { nome: string; tipo: string } | null;
  };
  // O client sem types gerados infere o join como array — na prática o FK
  // singular devolve objeto único.
  const listaSemana = (transacoesSemana ?? []) as unknown as TransacaoSemana[];
  const nomeCartao = new Map((cartoes ?? []).map((c) => [c.id, c.nome]));
  const porDiaSemana = new Map<string, TransacaoSemana[]>();
  for (const t of listaSemana) {
    const grupo = porDiaSemana.get(t.data) ?? [];
    grupo.push(t);
    porDiaSemana.set(t.data, grupo);
  }

  const percentualMeta =
    atual.meta && atual.meta > 0 ? (atual.gasto / atual.meta) * 100 : null;
  const estourou = percentualMeta != null && percentualMeta > 100;
  const projecaoEstoura =
    atual.projecao != null && atual.meta != null && atual.projecao > atual.meta;
  const restante = atual.meta != null ? atual.meta - atual.gasto : null;
  const maiorDia = [...atual.porDia].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">
            {atual.rotulo} · {dataBR(atual.inicio)} a {dataBR(atual.fim)}
          </h1>
          <div className="mt-1">
            <MetaEditavel
              entidadeId={ENTIDADE_FAMILIA}
              semanaInicio={atual.inicio}
              meta={atual.meta}
            />
          </div>
        </div>
        {streak > 0 && (
          <span className="rounded-full bg-bank-positivo-bg px-3 py-1 text-xs font-medium text-bank-positivo">
            🔥 {streak} semana{streak > 1 ? "s" : ""} seguida{streak > 1 ? "s" : ""} dentro da meta
          </span>
        )}
      </div>

      {/* Métricas do topo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CardMetrica
          label="Gasto da semana"
          valor={moedaBRL(atual.gasto)}
          corValor={estourou ? "text-bank-negativo" : undefined}
          apoio={
            atual.meta != null ? (
              <>
                de {moedaBRL(atual.meta)}
                {restante != null &&
                  (restante >= 0
                    ? ` · sobram ${moedaBRL(restante)}`
                    : ` · ${moedaBRL(-restante)} acima`)}
              </>
            ) : (
              <>sem meta cadastrada</>
            )
          }
          icone={<IconTarget size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Se o ritmo continuar"
          valor={atual.projecao != null ? moedaBRL(atual.projecao) : "—"}
          corValor={projecaoEstoura ? "text-bank-negativo" : "text-bank-positivo"}
          apoio={
            atual.projecao != null ? (
              <>
                {atual.diasDecorridos} de 7 dias · faltam {atual.diasRestantes}
              </>
            ) : (
              <>semana fechada</>
            )
          }
          icone={<IconTrendingUp size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Normal das semanas fechadas"
          valor={mediaHistorica != null ? moedaBRL(mediaHistorica) : "—"}
          apoio={
            mediaHistorica != null ? (
              <>média de {anteriores.length} semana(s)</>
            ) : (
              <>ainda não há semana fechada</>
            )
          }
          icone={<IconCalendarEvent size={18} stroke={1.7} />}
        />
      </div>

      {/* Barra da meta */}
      {atual.meta != null && (
        <section className="card-bank p-4 sm:p-5">
          <ProgressBar
            percentual={Math.min(100, percentualMeta ?? 0)}
            cor={estourou ? "var(--color-bank-negativo)" : "var(--color-bank-positivo)"}
          />
          <p className="mt-2 text-xs text-text-faint">
            {(percentualMeta ?? 0).toFixed(0)}% da meta
            {projecaoEstoura && atual.projecao != null && (
              <span className="text-bank-negativo">
                {" "}
                · no ritmo atual fecha {moedaBRL(atual.projecao - (atual.meta ?? 0))} acima
              </span>
            )}
          </p>
        </section>
      )}

      {/* Os 7 dias */}
      <section className="card-bank p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Os 7 dias</h2>
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-3">
          {atual.porDia.map((d) => {
            const altura =
              maiorDia && maiorDia.total > 0 ? (d.total / maiorDia.total) * 100 : 0;
            const futuro = d.data > atual.inicio && atual.diasDecorridos < 7 &&
              d.data > adicionarDias(atual.inicio, atual.diasDecorridos - 1);
            return (
              <div key={d.data} className="flex flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end">
                  <div
                    className={`w-full rounded-t-[4px] ${
                      futuro ? "bg-surface-3" : "bg-bank-primaria"
                    }`}
                    style={{ height: `${Math.max(altura, d.total > 0 ? 4 : 1)}%` }}
                    title={moedaBRL(d.total)}
                  />
                </div>
                <span className="text-[10px] text-text-faint">{d.diaSemana}</span>
                <span className="text-[10px] text-text-secondary numeros-tabulares sm:text-xs">
                  {d.total > 0 ? moedaBRL(d.total).replace("R$", "").trim() : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categorias com plano */}
      <PlanoCategorias
        linhas={atual.porCategoria}
        entidadeId={ENTIDADE_FAMILIA}
        metaTotal={atual.meta}
      />

      {/* Lançamentos da semana — dia a dia, com edição/exclusão inline */}
      <section className="card-bank divide-y divide-border">
        <div className="p-4 sm:p-6 sm:pb-0">
          <h2 className="text-sm font-semibold">Lançamentos da semana</h2>
        </div>
        {listaSemana.length === 0 && (
          <p className="p-4 text-sm text-text-faint sm:p-6">
            Nenhum lançamento nesta semana ainda.
          </p>
        )}
        {[...porDiaSemana.entries()].map(([data, itens]) => (
          <div key={data} className="p-4 sm:p-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-faint">
              {new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              })}
            </p>
            <div className="flex flex-col gap-2.5">
              {itens.map((t) => {
                const receita = t.categoria?.tipo === "receita";
                const formaLabel = t.forma_pagamento ? ROTULO_FORMA[t.forma_pagamento] : null;
                const cartao =
                  t.cartao_id && nomeCartao.has(t.cartao_id) ? nomeCartao.get(t.cartao_id)! : null;
                const detalhe =
                  [formaLabel, cartao ? `(${cartao})` : null].filter(Boolean).join(" ") || null;
                return (
                  <LinhaTransacao
                    key={t.id}
                    id={t.id}
                    descricao={t.descricao}
                    valor={Number(t.valor)}
                    data={t.data}
                    categoria_id={t.categoria_id}
                    categoriaNome={t.categoria?.nome ?? null}
                    receita={receita}
                    recorrente={!!t.recorrencia_id}
                    detalhe={detalhe}
                    categorias={categorias ?? []}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Histórico: Smn 01 … Smn 15, cada uma abre o próprio resumo */}
      <ListaSemanas semanas={anteriores} />
    </div>
  );
}

function adicionarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
