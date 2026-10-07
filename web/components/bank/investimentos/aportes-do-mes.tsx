import Link from "next/link";
import { moedaBRL } from "@/lib/bank/formato";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { rotuloMes } from "@/lib/bank/plano";
import type { MovimentoCarteira } from "@/lib/bank/aporte";

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// De onde veio o aporte do mês. O número já existia no placar do plano, mas
// sozinho: "R$ 1.075,80" não conta que foram R$ 1.000 no XP Horizonte e
// R$ 75,80 em MCRE11 no dia 7. A lista vem de `movimentos_carteira`, que a
// sincronização preenche comparando a carteira com a rodada anterior.
export function AportesDoMes({
  mes,
  movimentos,
  realizado,
  planejado,
  informado = false,
  comLink = false,
}: {
  mes: number;
  movimentos: MovimentoCarteira[];
  realizado: number;
  planejado: number;
  /** Aporte digitado à mão em `aportes_mensais` — vence o que a carteira mostra. */
  informado?: boolean;
  comLink?: boolean;
}) {
  const entradas = movimentos.filter((m) => m.tipo === "entrada");
  const retiradas = movimentos.filter((m) => m.tipo === "retirada");
  const pct = planejado > 0 ? (realizado / planejado) * 100 : 0;
  const falta = planejado - realizado;

  return (
    <section className="card-bank p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold">Aportes de {rotuloMes(mes)}</h2>
        {comLink && (
          <Link
            href="/bank/plano"
            className="text-xs text-text-faint underline decoration-dotted underline-offset-2 hover:text-text-primary"
          >
            ver o plano
          </Link>
        )}
      </div>

      <p className="mt-2 text-2xl font-semibold numeros-tabulares">
        {moedaBRL(realizado)}
        <span className="text-sm font-normal text-text-faint"> de {moedaBRL(planejado)}</span>
      </p>
      <ProgressBar percentual={pct} cor="var(--color-bank-positivo)" className="mt-2" />
      <p className="mt-2 text-xs text-text-secondary">
        {falta <= 1 ? "✓ Aporte do mês cumprido." : `Faltam ${moedaBRL(falta)} pra fechar o mês.`}
      </p>

      {entradas.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {entradas.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-10 shrink-0 text-xs text-text-faint numeros-tabulares">
                {diaMes(m.data)}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-primary">{m.ticker}</span>
              <span className="shrink-0 font-medium text-bank-positivo numeros-tabulares">
                + {moedaBRL(m.valor)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-text-faint">
          {informado
            ? "Aporte informado à mão — este mês não veio da carteira espelhada."
            : "Nenhuma entrada registrada ainda. Comprou no Investidor10? Ela aparece aqui na próxima sincronização."}
        </p>
      )}

      {retiradas.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          {retiradas.map((m) => (
            <p key={m.id} className="flex items-center gap-3 py-0.5 text-xs text-text-faint">
              <span className="w-10 shrink-0 numeros-tabulares">{diaMes(m.data)}</span>
              <span className="min-w-0 flex-1 truncate">{m.ticker}</span>
              <span className="shrink-0 numeros-tabulares">− {moedaBRL(m.valor)}</span>
            </p>
          ))}
          {/* Retirada não desconta o aporte (decisão do Arlison, 01/out/2026) —
              mas sumir com ela da tela seria esconder movimento de dinheiro. */}
          <p className="mt-1 text-[11px] text-text-faint">Resgates — não descontam do aporte do mês.</p>
        </div>
      )}

      {informado && entradas.length > 0 && (
        <p className="mt-3 text-[11px] text-text-faint">
          O valor do mês foi informado à mão e é o que vale no placar.
        </p>
      )}
    </section>
  );
}
