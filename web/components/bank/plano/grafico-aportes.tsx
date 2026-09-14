"use client";

import { Bar } from "@/components/bank/ui/grafico";
import { rotuloMes } from "@/lib/bank/plano";

// A rampa do aporte: o que o plano pede em cada mês (claro) e o que entrou de
// verdade (verde quando cumpriu, vermelho quando ficou abaixo). É o placar
// que depende só da família — a bolsa não mexe nele.
export function GraficoAportes({
  meses,
}: {
  meses: Array<{ mes: number; planejado: number; realizado: number | null }>;
}) {
  return (
    <div className="h-56">
      <Bar
        data={{
          labels: meses.map((m) => rotuloMes(m.mes)),
          datasets: [
            {
              label: "Plano pede",
              data: meses.map((m) => Math.round(m.planejado)),
              backgroundColor: "#dbeafe",
              borderRadius: 3,
              grouped: false,
              order: 2,
            },
            {
              label: "Aportado",
              data: meses.map((m) => (m.realizado == null ? null : Math.max(0, Math.round(m.realizado)))),
              backgroundColor: meses.map((m) =>
                m.realizado != null && m.realizado >= m.planejado - 1 ? "#16a34a" : "#dc2626",
              ),
              borderRadius: 3,
              barPercentage: 0.5,
              grouped: false,
              order: 1,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 12, boxHeight: 12 } },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  ctx.raw == null
                    ? ""
                    : ` ${ctx.dataset.label}: R$ ${Number(ctx.raw).toLocaleString("pt-BR")}`,
              },
            },
          },
          scales: {
            y: { ticks: { callback: (v) => `R$ ${Number(v).toLocaleString("pt-BR")}` } },
            x: { grid: { display: false }, ticks: { maxTicksLimit: 12, autoSkip: true } },
          },
        }}
      />
    </div>
  );
}
