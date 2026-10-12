import { moedaBRL } from "@/lib/bank/formato";
import type { CarteiraArca } from "@/lib/bank/arca";

const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// A carteira no modelo ARCA — o que entrou no lugar do donut de alocação e do
// gráfico de evolução (pedido do Arlison, 12/out/2026: "isso eu já tenho no
// Investidor10"). Cada letra mostra onde está contra os 25%, e embaixo o
// aporte do mês já repartido entre as que estão atrasadas.
export function CarteiraNoArca({ arca, aporte }: { arca: CarteiraArca; aporte: number }) {
  return (
    <section className="card-bank p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold">Sua carteira no modelo ARCA</h2>
        <span className="text-xs text-text-secondary">
          equilíbrio {arca.equilibrio}% · meta de 25% em cada
        </span>
      </div>
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full"
          style={{ width: `${arca.equilibrio}%`, background: "var(--color-bank-positivo)" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {arca.fatias.map((f) => {
          // A barra enche até 100% quando a letra chega nos 25% da carteira;
          // o traço marca onde é a meta.
          const preenchido = Math.min(100, (f.percentual / 25) * 100);
          return (
            <div key={f.chave} className="rounded-[14px] border border-border bg-surface-1 p-3 sm:p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold leading-none" style={{ color: f.cor }}>
                  {f.letra}
                </span>
                <span className="truncate text-xs text-text-secondary">{f.nome}</span>
              </div>
              <p className="mt-2.5 text-lg font-semibold numeros-tabulares">{moedaBRL(f.valor)}</p>
              <p className="text-xs text-text-faint">{pct(f.percentual)} da carteira</p>
              <div className="relative mt-2.5 h-2 w-full rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${preenchido}%`, background: f.cor }}
                />
                <span
                  className="absolute -top-1 h-4 w-px"
                  style={{ left: "100%", background: "var(--color-text-faint)" }}
                />
              </div>
              <p className="mt-2 text-[11px] text-text-faint">
                {f.falta > 0
                  ? `faltam ${moedaBRL(f.falta)}`
                  : `${moedaBRL(f.excesso)} acima da meta`}
              </p>
            </div>
          );
        })}
      </div>

      {arca.reparticao.length > 0 && aporte > 0 && (
        <div className="mt-4 rounded-[14px] bg-surface-1 p-3 sm:p-4">
          <p className="text-xs text-text-secondary">
            O próximo aporte de {moedaBRL(aporte)}, pelo ARCA
          </p>
          <div className="mt-2.5 flex h-7 gap-0.5 overflow-hidden rounded-md">
            {arca.reparticao.map((r) => (
              <div
                key={r.chave}
                className="flex items-center justify-center text-[11px] font-medium text-white"
                style={{ width: `${(r.valor / aporte) * 100}%`, background: r.cor }}
                title={r.nome}
              >
                {moedaBRL(r.valor)}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-text-faint">
            {arca.fatias
              .filter((f) => f.excesso > 0)
              .map((f) => `Nada em ${f.nome.toLowerCase()} — já está ${moedaBRL(f.excesso)} acima dos 25%.`)
              .join(" ")}
          </p>
        </div>
      )}

      {arca.fora.itens.length > 0 && (
        <p className="mt-4 text-xs text-text-faint">
          Fora do ARCA:{" "}
          {arca.fora.itens.map((i) => `${i.rotulo} ${moedaBRL(i.valor)}`).join(" · ")} — proteção que
          não se rebalança.
        </p>
      )}
    </section>
  );
}
