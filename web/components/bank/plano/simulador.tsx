"use client";

import { useMemo, useState } from "react";
import { Line } from "@/components/bank/ui/grafico";
import { projetarPatrimonio, anoDoMarco, MARCOS_PLANO } from "@/lib/bank/projecao";
import { salvarParametrosPlano } from "@/lib/bank/acoes/planos";

function brlCompacto(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}K`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

const ROTULO_MARCO: Record<number, string> = {
  100_000: "R$ 100 mil",
  500_000: "R$ 500 mil",
  1_000_000: "R$ 1 milhão",
  3_000_000: "R$ 3 milhões",
  6_000_000: "R$ 6 milhões",
};

// Simulador interativo do plano R$ 6M: sliders de aporte e rentabilidade
// recalculam a curva em tempo real sobre o patrimônio atual e mostram em
// que ano cada marco cai. Salvar persiste os parâmetros.
export function SimuladorPlano({
  entidadeId,
  patrimonioAtual,
  curvaPlano,
  aporteInicial,
  rentabilidadeInicial,
}: {
  entidadeId: string;
  patrimonioAtual: number;
  curvaPlano: Array<{ ano: number; valor_alvo: number }>;
  aporteInicial: number;
  rentabilidadeInicial: number;
}) {
  const [aporteMensal, setAporteMensal] = useState(aporteInicial);
  const [rentabilidade, setRentabilidade] = useState(rentabilidadeInicial);

  const anoAtual = new Date().getFullYear();
  const anoFinal = Math.max(2049, anoAtual + 5);

  const simulacao = useMemo(
    () => projetarPatrimonio(patrimonioAtual, aporteMensal, rentabilidade, anoAtual, anoFinal),
    [patrimonioAtual, aporteMensal, rentabilidade, anoAtual, anoFinal],
  );

  const anos = curvaPlano.map((p) => p.ano);
  const simuladoPorAno = new Map(simulacao.map((p) => [p.ano, p.valor]));
  const ano6M = anoDoMarco(simulacao, 6_000_000);

  return (
    <div className="flex flex-col gap-5">
      {/* Sliders */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <span className="flex justify-between">
            Aporte mensal
            <span className="font-semibold text-text-primary">
              {aporteMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={15000}
            step={100}
            value={aporteMensal}
            onChange={(e) => setAporteMensal(Number(e.target.value))}
            className="accent-[#2563eb]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <span className="flex justify-between">
            Rentabilidade anual
            <span className="font-semibold text-text-primary">
              {rentabilidade.toLocaleString("pt-BR")}% a.a.
            </span>
          </span>
          <input
            type="range"
            min={4}
            max={20}
            step={0.5}
            value={rentabilidade}
            onChange={(e) => setRentabilidade(Number(e.target.value))}
            className="accent-[#2563eb]"
          />
        </label>
      </div>

      {/* Curva plano × simulação */}
      <div className="h-64">
        <Line
          data={{
            labels: anos.map(String),
            datasets: [
              {
                label: "Plano original (12% a.a.)",
                data: curvaPlano.map((p) => p.valor_alvo),
                borderColor: "#94a3b8",
                backgroundColor: "transparent",
                borderDash: [6, 4],
                pointRadius: 0,
                tension: 0.3,
              },
              {
                label: "Sua simulação",
                data: anos.map((a) => simuladoPorAno.get(a) ?? null),
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                fill: true,
                pointRadius: 0,
                tension: 0.3,
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
                  label: (ctx) => ` ${ctx.dataset.label}: ${brlCompacto(Number(ctx.raw ?? 0))}`,
                },
              },
            },
            scales: {
              y: { ticks: { callback: (v) => brlCompacto(Number(v)) } },
              x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } },
            },
          }}
        />
      </div>

      {/* Marcos */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {MARCOS_PLANO.map((marco) => {
          const ano = anoDoMarco(simulacao, marco);
          const atingido = patrimonioAtual >= marco;
          return (
            <div
              key={marco}
              className={`rounded-[10px] border p-3 text-center ${
                atingido
                  ? "border-bank-positivo bg-bank-positivo-bg"
                  : "border-border bg-surface-1"
              }`}
            >
              <p className="text-xs font-semibold text-text-primary">{ROTULO_MARCO[marco]}</p>
              <p className={`mt-1 text-sm font-bold ${atingido ? "text-bank-positivo" : ano ? "text-text-primary" : "text-text-faint"}`}>
                {atingido ? "✓ feito" : (ano ?? "—")}
              </p>
            </div>
          );
        })}
      </div>

      {ano6M && (
        <p className="text-sm text-text-secondary">
          Nesse ritmo, os <span className="font-semibold text-text-primary">R$ 6 milhões</span>{" "}
          chegam em <span className="font-semibold text-bank-primaria">{ano6M}</span>
          {ano6M <= 2049
            ? ` — ${2049 - ano6M} ano(s) antes do plano original.`
            : ` — ${ano6M - 2049} ano(s) depois do plano original (2049).`}
        </p>
      )}

      {/* Salvar parâmetros */}
      <form action={salvarParametrosPlano} className="flex items-center gap-3">
        <input type="hidden" name="entidade_id" value={entidadeId} />
        <input type="hidden" name="caminho" value="/bank/plano" />
        <input type="hidden" name="param_plano6m_aporte_mensal" value={aporteMensal} />
        <input type="hidden" name="param_plano6m_rentabilidade_aa" value={rentabilidade} />
        <button
          type="submit"
          className="rounded-[8px] bg-bank-primaria px-4 py-2 text-sm font-medium text-white"
        >
          Salvar esses parâmetros
        </button>
        <span className="text-xs text-text-faint">ficam como padrão do simulador e do score</span>
      </form>
    </div>
  );
}
