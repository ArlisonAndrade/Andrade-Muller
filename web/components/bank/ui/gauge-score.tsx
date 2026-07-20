"use client";

import { Doughnut } from "@/components/bank/ui/grafico";

function corDoScore(total: number) {
  if (total >= 75) return "#16a34a";
  if (total >= 50) return "#f59e0b";
  return "#dc2626";
}

// Meio-donut com o score no centro.
export function GaugeScore({ total }: { total: number }) {
  const cor = corDoScore(total);
  return (
    <div className="relative mx-auto h-28 w-52">
      <Doughnut
        data={{
          datasets: [
            {
              data: [total, 100 - total],
              backgroundColor: [cor, "#eef1f4"],
              borderWidth: 0,
              circumference: 180,
              rotation: 270,
            },
          ],
        }}
        options={{
          cutout: "75%",
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        }}
      />
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-3xl font-bold" style={{ color: cor }}>
          {total}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-text-faint">de 100</p>
      </div>
    </div>
  );
}
