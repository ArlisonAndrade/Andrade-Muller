import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { moedaBRL, dataBR } from "@/lib/bank/formato";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { IconPlus } from "@/components/bank/ui/icones";

export const metadata = { title: "Dívidas" };

// Lista de dívidas — visão geral com progresso e economia de juros;
// o jogo de quitação acontece no detalhe.
export default async function PaginaDividas() {
  const supabase = await createClient();

  const [{ data: dividas }, { data: parcelasAdiantadas }] = await Promise.all([
    supabase
      .from("dividas")
      .select("id, descricao, valor_total, valor_pago, parcelas_total, parcelas_pagas, data_vencimento_proxima, quitada, taxa_juros_mensal")
      .order("quitada")
      .order("data_vencimento_proxima", { ascending: true, nullsFirst: false }),
    supabase
      .from("parcelas_divida")
      .select("divida_id, valor_juros")
      .eq("adiantada", true)
      .eq("paga", true),
  ]);

  const economiaPorDivida = new Map<string, number>();
  for (const p of parcelasAdiantadas ?? []) {
    economiaPorDivida.set(
      p.divida_id,
      (economiaPorDivida.get(p.divida_id) ?? 0) + Number(p.valor_juros ?? 0),
    );
  }

  const lista = dividas ?? [];
  const abertas = lista.filter((d) => !d.quitada);
  const quitadas = lista.filter((d) => d.quitada);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Dívidas</h1>
        <Link
          href="/bank/dividas/nova"
          className="flex items-center gap-1.5 rounded-[8px] bg-bank-primaria px-3 py-2 text-sm font-medium text-white"
        >
          <IconPlus size={16} stroke={2} /> Nova dívida
        </Link>
      </div>

      {abertas.length === 0 && (
        <div className="card-bank p-8 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-sm font-medium text-text-primary">
            Nenhuma dívida em aberto.
          </p>
          <p className="mt-1 text-sm text-text-faint">
            Quando cadastrar uma (com taxa e nº de parcelas), o cronograma
            completo é gerado sozinho e você acompanha a quitação aqui.
          </p>
        </div>
      )}

      {abertas.map((d) => {
        const progresso = d.valor_total
          ? Math.min(100, (Number(d.valor_pago) / Number(d.valor_total)) * 100)
          : 0;
        const economia = economiaPorDivida.get(d.id) ?? 0;
        return (
          <Link key={d.id} href={`/bank/dividas/${d.id}`} className="card-bank block p-5 transition-shadow hover:shadow-md">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{d.descricao}</p>
              <p className="text-sm font-medium text-text-primary">
                falta {moedaBRL(Number(d.valor_total) - Number(d.valor_pago))}
              </p>
            </div>
            <div className="mt-3">
              <ProgressBar percentual={progresso} cor="var(--color-bank-positivo)" />
            </div>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-text-faint">
              <span>
                {moedaBRL(Number(d.valor_pago))} pagos ({progresso.toFixed(0)}%)
                {d.parcelas_total ? ` · ${d.parcelas_pagas ?? 0}/${d.parcelas_total} parcelas` : ""}
                {d.data_vencimento_proxima ? ` · próxima ${dataBR(String(d.data_vencimento_proxima))}` : ""}
              </span>
              {economia > 0 && (
                <span className="font-medium text-bank-positivo">
                  {moedaBRL(economia)} de juros economizados
                </span>
              )}
            </div>
          </Link>
        );
      })}

      {quitadas.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text-faint">Quitadas 🏆</h2>
          <div className="flex flex-col gap-2">
            {quitadas.map((d) => (
              <Link
                key={d.id}
                href={`/bank/dividas/${d.id}`}
                className="card-bank flex items-center justify-between p-4 opacity-70"
              >
                <p className="text-sm text-text-secondary line-through">{d.descricao}</p>
                <p className="text-xs font-medium text-bank-positivo">
                  {moedaBRL(Number(d.valor_pago))} quitados
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
