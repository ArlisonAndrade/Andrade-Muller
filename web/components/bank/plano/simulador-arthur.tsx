"use client";

import { useMemo, useState } from "react";
import { Line } from "@/components/bank/ui/grafico";
import { salvarParametrosPlano } from "@/lib/bank/acoes/planos";

const NASCIMENTO = "2022-10-30"; // Arthur

function brlCompacto(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}K`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// Projeção do nascimento (30/10/2022) até a idade-alvo: aporte mensal +
// aporte extra no mês do aniversário. Cada ponto é uma idade do Arthur.
type PontoArthur = { idade: number; valor: number };

function projetarArthur(
  patrimonioAtual: number,
  aporteMensal: number,
  aporteAniversario: number,
  rentabilidadeAnual: number,
  idadeAlvo: number,
): PontoArthur[] {
  const nasc = new Date(NASCIMENTO);
  const hoje = new Date();
  const idadeAtual = (hoje.getTime() - nasc.getTime()) / (365.25 * 24 * 3600 * 1000);
  const taxaMensal = Math.pow(1 + rentabilidadeAnual / 100, 1 / 12) - 1;

  const pontos: PontoArthur[] = [];
  let valor = patrimonioAtual;
  // Começa da idade atual (arredondada pra baixo) e avança mês a mês.
  const mesesRestantes = Math.max(0, Math.round((idadeAlvo - idadeAtual) * 12));
  let mesGlobal = Math.floor(idadeAtual * 12);
  for (let k = 0; k < mesesRestantes; k++) {
    valor = valor * (1 + taxaMensal) + aporteMensal;
    mesGlobal++;
    // Mês do aniversário (mês 0 do ciclo de 12 a partir do nascimento em out).
    if (mesGlobal % 12 === 0) valor += aporteAniversario;
    if (mesGlobal % 12 === 0) {
      pontos.push({ idade: Math.round(mesGlobal / 12), valor: Math.round(valor * 100) / 100 });
    }
  }
  // Garante o ponto final na idade-alvo.
  if (pontos.length === 0 || pontos[pontos.length - 1].idade < idadeAlvo) {
    pontos.push({ idade: idadeAlvo, valor: Math.round(valor * 100) / 100 });
  }
  return pontos;
}

export function SimuladorArthur({
  entidadeId,
  patrimonioAtual,
  aporteMensalInicial,
  aporteAniversarioInicial,
  rentabilidadeInicial,
  idadeAlvoInicial,
}: {
  entidadeId: string;
  patrimonioAtual: number;
  aporteMensalInicial: number;
  aporteAniversarioInicial: number;
  rentabilidadeInicial: number;
  idadeAlvoInicial: number;
}) {
  const [aporteMensal, setAporteMensal] = useState(aporteMensalInicial);
  const [aporteAniversario, setAporteAniversario] = useState(aporteAniversarioInicial);
  const [rentabilidade, setRentabilidade] = useState(rentabilidadeInicial);
  const [idadeAlvo, setIdadeAlvo] = useState(idadeAlvoInicial);

  const projecao = useMemo(
    () => projetarArthur(patrimonioAtual, aporteMensal, aporteAniversario, rentabilidade, idadeAlvo),
    [patrimonioAtual, aporteMensal, aporteAniversario, rentabilidade, idadeAlvo],
  );
  const valorFinal = projecao[projecao.length - 1]?.valor ?? patrimonioAtual;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <span className="flex justify-between">
            Aporte mensal
            <span className="font-semibold text-text-primary">{brl(aporteMensal)}</span>
          </span>
          <input type="range" min={0} max={2000} step={50} value={aporteMensal}
            onChange={(e) => setAporteMensal(Number(e.target.value))} className="accent-[#3b5b74]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <span className="flex justify-between">
            Aporte de aniversário
            <span className="font-semibold text-text-primary">{brl(aporteAniversario)}</span>
          </span>
          <input type="range" min={0} max={10000} step={100} value={aporteAniversario}
            onChange={(e) => setAporteAniversario(Number(e.target.value))} className="accent-[#3b5b74]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <span className="flex justify-between">
            Rentabilidade anual
            <span className="font-semibold text-text-primary">{rentabilidade.toLocaleString("pt-BR")}% a.a.</span>
          </span>
          <input type="range" min={4} max={16} step={0.5} value={rentabilidade}
            onChange={(e) => setRentabilidade(Number(e.target.value))} className="accent-[#3b5b74]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <span className="flex justify-between">
            Idade alvo
            <span className="font-semibold text-text-primary">{idadeAlvo} anos</span>
          </span>
          <input type="range" min={16} max={25} step={1} value={idadeAlvo}
            onChange={(e) => setIdadeAlvo(Number(e.target.value))} className="accent-[#3b5b74]" />
        </label>
      </div>

      <div className="rounded-[12px] bg-arthur/10 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-text-faint">
          Patrimônio do Arthur aos {idadeAlvo} anos
        </p>
        <p className="mt-1 text-3xl font-bold text-arthur">{brlCompacto(valorFinal)}</p>
      </div>

      <div className="h-56">
        <Line
          data={{
            labels: projecao.map((p) => `${p.idade}a`),
            datasets: [
              {
                label: "Patrimônio projetado",
                data: projecao.map((p) => p.valor),
                borderColor: "#3b5b74",
                backgroundColor: "rgba(59, 91, 116, 0.1)",
                fill: true,
                pointRadius: 2,
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

      <form action={salvarParametrosPlano} className="flex items-center gap-3">
        <input type="hidden" name="entidade_id" value={entidadeId} />
        <input type="hidden" name="caminho" value="/bank/arthur" />
        <input type="hidden" name="param_arthur_aporte_mensal" value={aporteMensal} />
        <input type="hidden" name="param_arthur_aporte_aniversario" value={aporteAniversario} />
        <input type="hidden" name="param_arthur_rentabilidade_aa" value={rentabilidade} />
        <input type="hidden" name="param_arthur_idade_alvo" value={idadeAlvo} />
        <button type="submit" className="rounded-[8px] bg-arthur px-4 py-2 text-sm font-medium text-white">
          Salvar o plano do Arthur
        </button>
      </form>
    </div>
  );
}
