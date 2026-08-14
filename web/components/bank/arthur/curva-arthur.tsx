"use client";

import { Line } from "@/components/bank/ui/grafico";

function brlCompacto(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}K`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

// Gráfico da curva planejada — precisa ser client component porque as
// callbacks de tooltip/eixo são funções, e Server Component não pode
// passar função como prop pra um Client Component (quebra a serialização
// do RSC). Recebe só dado plano (números), monta as opções aqui dentro.
export function CurvaArthur({ pontos }: { pontos: { idade: number; valor: number }[] }) {
  return (
    <div className="h-56">
      <Line
        data={{
          labels: pontos.map((p) => `${p.idade}a`),
          datasets: [
            {
              label: "Patrimônio planejado",
              data: pontos.map((p) => p.valor),
              borderColor: "#3b5b74",
              backgroundColor: "rgba(59, 91, 116, 0.12)",
              fill: true,
              pointRadius: 3,
              tension: 0.3,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => `Aos ${items[0].label}`,
                label: (ctx) => ` ${brlCompacto(Number(ctx.raw ?? 0))}`,
              },
            },
          },
          scales: {
            y: { ticks: { callback: (v) => brlCompacto(Number(v)) } },
            x: { grid: { display: false } },
          },
        }}
      />
    </div>
  );
}
