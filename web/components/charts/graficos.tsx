"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line, Bar, Radar } from "react-chartjs-2";
import { moedaBRL } from "@/lib/formato";

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
);

// Tokens do PRD 5.1 — os mesmos do globals.css
const COR = {
  marinho: "#1F3347",
  bronze: "#B8925A",
  salvia: "#4C6B50",
  terracota: "#8C4A5E",
  divider: "#EDE7D6",
  inkFaint: "#8A8874",
  card: "#FFFDF8",
};

ChartJS.defaults.font.family = "Inter, ui-sans-serif, system-ui, sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.color = COR.inkFaint;

const tooltipBase = {
  backgroundColor: COR.marinho,
  titleFont: { size: 11 },
  bodyFont: { size: 12 },
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
};

// Tendência de faturamento — área (PRD 5.3), série única em bronze
export function GraficoArea({
  rotulos,
  valores,
}: {
  rotulos: string[];
  valores: number[];
}) {
  return (
    <div className="h-56">
      <Line
        data={{
          labels: rotulos,
          datasets: [
            {
              data: valores,
              borderColor: COR.bronze,
              backgroundColor: "rgba(184, 146, 90, 0.16)",
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: COR.bronze,
              pointBorderColor: COR.card,
              pointBorderWidth: 1.5,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              ...tooltipBase,
              callbacks: { label: (c) => moedaBRL(Number(c.parsed.y)) },
            },
          },
          scales: {
            x: { grid: { display: false }, border: { color: COR.divider } },
            y: {
              grid: { color: COR.divider },
              border: { display: false },
              ticks: {
                callback: (v) =>
                  `${(Number(v) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`,
              },
            },
          },
        }}
      />
    </div>
  );
}

// Comparação por cliente — barras horizontais; identidade pelo rótulo do
// eixo (nome do cliente), cor por categoria como reforço, nunca sozinha
export function GraficoBarrasClientes({
  itens,
}: {
  itens: { nome: string; valor: number; cor: keyof typeof COR }[];
}) {
  return (
    <div className="h-56">
      <Bar
        data={{
          labels: itens.map((i) => i.nome),
          datasets: [
            {
              data: itens.map((i) => i.valor),
              backgroundColor: itens.map((i) => COR[i.cor]),
              borderRadius: 4,
              barThickness: 22,
            },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              ...tooltipBase,
              callbacks: { label: (c) => moedaBRL(Number(c.parsed.x)) },
            },
          },
          scales: {
            x: {
              grid: { color: COR.divider },
              border: { display: false },
              ticks: {
                callback: (v) =>
                  `${(Number(v) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`,
              },
            },
            y: { grid: { display: false }, border: { color: COR.divider } },
          },
        }}
      />
    </div>
  );
}

// Saúde operacional — radar com os 5 eixos do checklist (PRD 5.3)
export function GraficoRadar({
  eixos,
  valores,
}: {
  eixos: string[];
  valores: number[];
}) {
  return (
    <div className="h-64">
      <Radar
        data={{
          labels: eixos,
          datasets: [
            {
              data: valores,
              borderColor: COR.salvia,
              backgroundColor: "rgba(76, 107, 80, 0.22)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: COR.salvia,
              pointBorderColor: COR.card,
              pointBorderWidth: 1.5,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              ...tooltipBase,
              callbacks: { label: (c) => `${Math.round(Number(c.parsed.r))}%` },
            },
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              grid: { color: COR.divider },
              angleLines: { color: COR.divider },
              pointLabels: { font: { size: 10 }, color: COR.inkFaint },
              ticks: { display: false, stepSize: 25 },
            },
          },
        }}
      />
    </div>
  );
}
