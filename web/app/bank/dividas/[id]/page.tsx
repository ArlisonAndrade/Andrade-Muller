import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moedaBRL, dataBR } from "@/lib/bank/formato";
import { resumoDivida, type ParcelaLida } from "@/lib/bank/calculos-divida";
import {
  pagarParcela,
  adiantarParcela,
  atualizarParcela,
} from "@/lib/bank/acoes/dividas";
import { CardMetrica } from "@/components/bank/ui/card-metrica";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { IconCheck, IconCoins, IconTarget, IconCalendarEvent } from "@/components/bank/ui/icones";

export const metadata = { title: "Dívida" };

// Detalhe da dívida — o "jogo" de quitação: métricas, timeline anual de
// parcelas, baixa normal (próxima) e adiantamento (última — paga só a
// amortização e o juro vira economia).
export default async function DetalheDivida({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ economia?: string }>;
}) {
  const { id } = await params;
  const { economia: economiaParam } = await searchParams;

  const supabase = await createClient();
  const [{ data: divida }, { data: parcelasRaw }, { data: contas }] = await Promise.all([
    supabase
      .from("dividas")
      .select("id, entidade_id, descricao, valor_total, valor_pago, taxa_juros_mensal, quitada")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("parcelas_divida")
      .select("id, numero, data_vencimento, valor_parcela, valor_amortizacao, valor_juros, paga, paga_em, adiantada, valor_pago_efetivo")
      .eq("divida_id", id)
      .order("numero"),
    supabase.from("contas").select("id, nome, entidade_id"),
  ]);
  if (!divida) notFound();

  const parcelas = (parcelasRaw ?? []) as unknown as Array<ParcelaLida & { id: string; paga_em: string | null }>;
  const r = resumoDivida(parcelas);
  const progresso =
    Number(divida.valor_total) > 0
      ? (Number(divida.valor_pago) / Number(divida.valor_total)) * 100
      : 0;
  const contasDaEntidade = (contas ?? []).filter((c) => c.entidade_id === divida.entidade_id);

  // Timeline agrupada por ano.
  const porAno = new Map<string, typeof parcelas>();
  for (const p of parcelas) {
    const ano = String(p.data_vencimento).slice(0, 4);
    const grupo = porAno.get(ano) ?? [];
    grupo.push(p);
    porAno.set(ano, grupo);
  }

  const parcelasDestruidas = r.pagas.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/bank/dividas" className="text-xs text-bank-primaria underline">
          ← Dívidas
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{divida.descricao}</h1>
        {divida.taxa_juros_mensal != null && (
          <p className="text-xs text-text-faint">
            {Number(divida.taxa_juros_mensal).toLocaleString("pt-BR")}% a.m.
          </p>
        )}
      </div>

      {economiaParam && Number(economiaParam) > 0 && (
        <p className="rounded-[10px] bg-bank-positivo-bg px-4 py-3 text-sm font-medium text-bank-positivo">
          🎉 Parcela adiantada! Você economizou {moedaBRL(Number(economiaParam))} de juros.
        </p>
      )}

      {divida.quitada && (
        <p className="rounded-[10px] bg-bank-positivo-bg px-4 py-3 text-sm font-medium text-bank-positivo">
          🏆 Dívida quitada. Liberdade!
        </p>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica
          label="Falta pagar"
          valor={moedaBRL(r.restante)}
          apoio={<>{r.abertas.length} parcelas restantes</>}
          icone={<IconTarget size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Já pago"
          valor={moedaBRL(Number(divida.valor_pago))}
          corValor="text-bank-positivo"
          apoio={<>{parcelasDestruidas} parcelas destruídas 💪</>}
          icone={<IconCheck size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Juros economizados"
          valor={moedaBRL(r.jurosEconomizados)}
          corValor={r.jurosEconomizados > 0 ? "text-bank-positivo" : "text-text-primary"}
          apoio={<>adiantando parcelas do fim</>}
          icone={<IconCoins size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Última parcela"
          valor={r.ultimaAberta ? dataBR(r.ultimaAberta.data_vencimento) ?? "—" : "—"}
          apoio={<>cada adiantamento puxa essa data pra perto</>}
          icone={<IconCalendarEvent size={18} stroke={1.7} />}
        />
      </div>

      {/* Progresso geral */}
      <section className="card-bank p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Progresso da quitação</h2>
          <span className="text-sm font-semibold text-bank-positivo">
            {progresso.toFixed(1)}%
          </span>
        </div>
        <ProgressBar percentual={progresso} cor="var(--color-bank-positivo)" altura="h-3" />
      </section>

      {/* Timeline anual */}
      {parcelas.length > 0 && (
        <section className="card-bank p-5">
          <h2 className="mb-1 text-sm font-semibold">Plano de pagamento</h2>
          <p className="mb-4 text-xs text-text-faint">
            <span className="mr-3 inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-bank-positivo" /> paga
            </span>
            <span className="mr-3 inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-bank-primaria" /> adiantada
            </span>
            <span className="mr-3 inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] border-2 border-bank-negativo bg-surface-1" /> próxima
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-surface-3" /> futura
            </span>
          </p>
          <div className="flex flex-col gap-3">
            {[...porAno.entries()].map(([ano, doAno]) => (
              <div key={ano} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs font-semibold text-text-secondary">
                  {ano}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {doAno.map((p) => {
                    const proxima = r.proxima && p.numero === r.proxima.numero;
                    const cor = p.paga
                      ? p.adiantada
                        ? "bg-bank-primaria"
                        : "bg-bank-positivo"
                      : proxima
                        ? "border-2 border-bank-negativo bg-surface-1"
                        : "bg-surface-3";
                    return (
                      <span
                        key={p.numero}
                        title={`#${p.numero} · ${dataBR(p.data_vencimento)} · ${moedaBRL(Number(p.valor_parcela))}`}
                        className={`flex h-6 w-6 items-center justify-center rounded-[5px] text-[9px] font-medium ${cor} ${
                          p.paga ? "text-white" : "text-text-faint"
                        }`}
                      >
                        {p.numero}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ações principais */}
      {!divida.quitada && parcelas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {r.proxima && (
            <form action={pagarParcela} className="card-bank flex flex-col gap-3 p-5">
              <input type="hidden" name="parcela_id" value={r.proxima.id} />
              <input type="hidden" name="divida_id" value={divida.id} />
              <div>
                <h3 className="text-sm font-semibold">Pagar próxima parcela</h3>
                <p className="mt-1 text-xs text-text-faint">
                  #{r.proxima.numero} · vence {dataBR(r.proxima.data_vencimento)} ·{" "}
                  {moedaBRL(Number(r.proxima.valor_parcela))}
                </p>
              </div>
              <select
                name="conta_id"
                defaultValue=""
                className="rounded-[8px] border border-border bg-surface-2 px-2 py-2 text-xs outline-none"
              >
                <option value="">Sem lançar no extrato</option>
                {contasDaEntidade.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lançar na conta {c.nome}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-[8px] bg-bank-positivo px-3 py-2.5 text-sm font-medium text-white"
              >
                Pagar {moedaBRL(Number(r.proxima.valor_parcela))}
              </button>
            </form>
          )}
          {r.ultimaAberta && r.ultimaAberta.numero !== r.proxima?.numero && (
            <form action={adiantarParcela} className="card-bank flex flex-col gap-3 p-5">
              <input type="hidden" name="parcela_id" value={r.ultimaAberta.id} />
              <input type="hidden" name="divida_id" value={divida.id} />
              <div>
                <h3 className="text-sm font-semibold">Adiantar última parcela</h3>
                <p className="mt-1 text-xs text-text-faint">
                  #{r.ultimaAberta.numero} · paga só a amortização (
                  {moedaBRL(Number(r.ultimaAberta.valor_amortizacao ?? r.ultimaAberta.valor_parcela))}
                  ) e economiza {moedaBRL(Number(r.ultimaAberta.valor_juros ?? 0))} de juros
                </p>
              </div>
              <select
                name="conta_id"
                defaultValue=""
                className="rounded-[8px] border border-border bg-surface-2 px-2 py-2 text-xs outline-none"
              >
                <option value="">Sem lançar no extrato</option>
                {contasDaEntidade.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lançar na conta {c.nome}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-[8px] bg-bank-primaria px-3 py-2.5 text-sm font-medium text-white"
              >
                Adiantar por {moedaBRL(Number(r.ultimaAberta.valor_amortizacao ?? r.ultimaAberta.valor_parcela))}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tabela de parcelas (com ajuste fino pra bater com o contrato) */}
      {parcelas.length > 0 && (
        <section className="card-bank overflow-x-auto p-5">
          <h2 className="mb-3 text-sm font-semibold">Parcelas</h2>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint">
                <th className="py-2 font-medium">#</th>
                <th className="py-2 font-medium">Vencimento</th>
                <th className="py-2 text-right font-medium">Parcela</th>
                <th className="py-2 text-right font-medium">Amortização</th>
                <th className="py-2 text-right font-medium">Juros</th>
                <th className="py-2 text-right font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parcelas.map((p) => (
                <tr key={p.id} className={p.paga ? "opacity-60" : ""}>
                  <td className="py-2">{p.numero}</td>
                  <td className="py-2">{dataBR(p.data_vencimento)}</td>
                  {p.paga ? (
                    <>
                      <td className="py-2 text-right">{moedaBRL(Number(p.valor_parcela))}</td>
                      <td className="py-2 text-right">
                        {p.valor_amortizacao != null ? moedaBRL(Number(p.valor_amortizacao)) : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {p.valor_juros != null ? moedaBRL(Number(p.valor_juros)) : "—"}
                      </td>
                    </>
                  ) : (
                    <td colSpan={3} className="py-2">
                      <form
                        action={atualizarParcela}
                        className="flex items-center justify-end gap-1.5"
                      >
                        <input type="hidden" name="parcela_id" value={p.id} />
                        <input type="hidden" name="divida_id" value={divida.id} />
                        <input
                          name="valor_parcela"
                          type="number"
                          step="0.01"
                          defaultValue={Number(p.valor_parcela).toFixed(2)}
                          className="w-24 rounded-[6px] border border-border bg-surface-2 px-2 py-1 text-right text-xs outline-none"
                          aria-label={`Valor da parcela ${p.numero}`}
                        />
                        <input
                          name="valor_amortizacao"
                          type="number"
                          step="0.01"
                          defaultValue={
                            p.valor_amortizacao != null
                              ? Number(p.valor_amortizacao).toFixed(2)
                              : ""
                          }
                          className="w-24 rounded-[6px] border border-border bg-surface-2 px-2 py-1 text-right text-xs outline-none"
                          aria-label={`Amortização da parcela ${p.numero}`}
                        />
                        <span className="w-20 text-right text-xs text-text-faint">
                          {p.valor_juros != null ? moedaBRL(Number(p.valor_juros)) : "—"}
                        </span>
                        <button
                          type="submit"
                          className="rounded-[6px] border border-border px-1.5 py-1 text-[10px] text-text-secondary hover:text-text-primary"
                        >
                          ok
                        </button>
                      </form>
                    </td>
                  )}
                  <td className="py-2 text-right">
                    {p.paga ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          p.adiantada
                            ? "bg-bank-primaria-bg text-bank-primaria"
                            : "bg-bank-positivo-bg text-bank-positivo"
                        }`}
                      >
                        {p.adiantada ? "adiantada" : "paga"} {p.paga_em ? dataBR(p.paga_em) : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-text-faint">em aberto</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {parcelas.length === 0 && (
        <div className="card-bank p-6 text-sm text-text-faint">
          Esta dívida não tem cronograma de parcelas (foi criada no modelo
          antigo). Dá pra continuar amortizando pelo{" "}
          <Link href={`/bank/dividas/${divida.id}/amortizar`} className="text-bank-primaria underline">
            registro livre
          </Link>
          , ou recriá-la com taxa + parcelas pra ganhar o plano completo.
        </div>
      )}
    </div>
  );
}
