"use client";

import { Bar } from "@/components/bank/ui/grafico";

type Ponto = { competencia: string; valorAplicado: number; ganho: number };

function rotuloMes(competencia: string) {
  const [ano, mes] = competencia.split("-");
  return `${mes}/${ano.slice(2)}`;
}

// Barras empilhadas: valor aplicado (verde forte) + ganho de capital
// (verde claro) — a estrutura do gráfico de evolução do Investidor10.
export function EvolucaoPatrimonio({ pontos }: { pontos: Ponto[] }) {
  if (pontos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-faint">
        O gráfico de evolução começa a ser desenhado a partir deste mês — cada
        mês vira uma barra nova aqui.
      </p>
    );
  }

  return (
    <div className="h-64">
      <Bar
        data={{
          labels: pontos.map((p) => rotuloMes(p.competencia)),
          datasets: [
            {
              label: "Valor aplicado",
              data: pontos.map((p) => p.valorAplicado),
              backgroundColor: "#16a34a",
              stack: "patrimonio",
              borderRadius: 3,
            },
            {
              label: "Ganho de capital",
              data: pontos.map((p) => p.ganho),
              backgroundColor: "#86efac",
              stack: "patrimonio",
              borderRadius: 3,
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
                  ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}`,
              },
            },
          },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: {
              stacked: true,
              ticks: {
                callback: (v) => `R$ ${(Number(v) / 1000).toLocaleString("pt-BR")}K`,
              },
            },
          },
        }}
      />
    </div>
  );
}
