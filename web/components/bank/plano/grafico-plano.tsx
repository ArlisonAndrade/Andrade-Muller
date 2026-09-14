"use client";

import { useState } from "react";
import { Line } from "@/components/bank/ui/grafico";
import { indiceMes, mesDoIndice, rotuloMes, type PontoMes } from "@/lib/bank/plano";

function compacto(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

// Plano (tracejado) × ritmo atual × carteira real. Abre nos próximos 5 anos:
// a curva inteira até 2049 achata o presente num risco colado no zero, e é o
// presente que se decide todo mês.
export function GraficoPlano({
  curvaPlano,
  ritmoAtual,
  reais,
  hoje,
}: {
  curvaPlano: PontoMes[];
  ritmoAtual: PontoMes[];
  reais: Array<{ mes: number; valor: number }>;
  hoje: number;
}) {
  const [horizonte, setHorizonte] = useState<"5anos" | "tudo">("5anos");

  const primeiro = Math.min(reais[0]?.mes ?? hoje, curvaPlano[0]?.mes ?? hoje);
  const ultimoPossivel = curvaPlano[curvaPlano.length - 1]?.mes ?? hoje;
  const ultimo = horizonte === "5anos" ? Math.min(ultimoPossivel, mesDoIndice(indiceMes(hoje) + 60)) : ultimoPossivel;

  const meses: number[] = [];
  for (let i = indiceMes(primeiro); i <= indiceMes(ultimo); i++) meses.push(mesDoIndice(i));

  const porMes = (lista: Array<{ mes: number; valor: number }>) => {
    const m = new Map(lista.map((p) => [p.mes, p.valor]));
    return meses.map((mes) => m.get(mes) ?? null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-1 text-xs">
        {(["5anos", "tudo"] as const).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizonte(h)}
            className={`rounded-full border px-2.5 py-1 ${
              horizonte === h
                ? "border-bank-primaria bg-bank-primaria-bg text-bank-primaria"
                : "border-border text-text-secondary"
            }`}
          >
            {h === "5anos" ? "Próximos 5 anos" : "Até a meta"}
          </button>
        ))}
      </div>
      <div className="h-64 sm:h-72">
        <Line
          data={{
            labels: meses.map(rotuloMes),
            datasets: [
              {
                label: "Plano",
                data: porMes(curvaPlano),
                borderColor: "#94a3b8",
                borderDash: [6, 4],
                backgroundColor: "transparent",
                pointRadius: 0,
                borderWidth: 1.5,
                tension: 0.2,
              },
              {
                label: "No ritmo de hoje",
                data: porMes(ritmoAtual),
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                fill: true,
                pointRadius: 0,
                borderWidth: 2,
                tension: 0.2,
              },
              {
                label: "Carteira real",
                data: porMes(reais),
                borderColor: "#16a34a",
                backgroundColor: "#16a34a",
                pointRadius: 2.5,
                borderWidth: 2,
                tension: 0.2,
                spanGaps: true,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: { position: "top", labels: { boxWidth: 12, boxHeight: 12 } },
              tooltip: {
                callbacks: {
                  label: (ctx) => (ctx.raw == null ? "" : ` ${ctx.dataset.label}: ${compacto(Number(ctx.raw))}`),
                },
              },
            },
            scales: {
              y: { ticks: { callback: (v) => compacto(Number(v)) } },
              x: { grid: { display: false }, ticks: { maxTicksLimit: 8, autoSkip: true } },
            },
          }}
        />
      </div>
    </div>
  );
}
