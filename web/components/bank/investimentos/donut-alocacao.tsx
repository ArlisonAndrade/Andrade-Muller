"use client";

import { Doughnut } from "@/components/bank/ui/grafico";

type Fatia = { rotulo: string; valor: number; cor: string };

export function DonutAlocacao({ fatias }: { fatias: Fatia[] }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-44 w-44 shrink-0">
        <Doughnut
          data={{
            labels: fatias.map((f) => f.rotulo),
            datasets: [
              {
                data: fatias.map((f) => f.valor),
                backgroundColor: fatias.map((f) => f.cor),
                borderWidth: 2,
                borderColor: "#ffffff",
              },
            ],
          }}
          options={{
            cutout: "62%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    ` ${ctx.label}: ${Number(ctx.raw).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}`,
                },
              },
            },
          }}
        />
      </div>
      <ul className="flex w-full flex-col gap-1.5">
        {fatias.map((f) => (
          <li key={f.rotulo} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-text-secondary">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: f.cor }} />
              {f.rotulo}
            </span>
            <span className="font-medium text-text-primary">
              {total > 0 ? ((f.valor / total) * 100).toFixed(2) : "0.00"}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
