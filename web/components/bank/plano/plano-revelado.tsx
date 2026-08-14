"use client";

import { anoDoMarco, MARCOS_PLANO, type PontoProjecao } from "@/lib/bank/projecao";

const EMOJI_MARCO: Record<number, string> = {
  100_000: "🌱",
  500_000: "🌿",
  1_000_000: "🌳",
  3_000_000: "⛰️",
  6_000_000: "🏆",
};

function brlCompacto(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}K`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// TSR (planilha original do Arlison) não é uma taxa — é a renda passiva
// mensal estimada se 6% a.a. do patrimônio daquele ano fosse sacado em
// 12 parcelas. Fixo em 6%, independente do slider de rentabilidade da
// simulação (que só projeta o crescimento do patrimônio em si).
const TSR_ANUAL_PCT = 6;
function tsrMensal(patrimonioDoAno: number) {
  return (patrimonioDoAno * (TSR_ANUAL_PCT / 100)) / 12;
}

// Revelação animada do plano salvo: nome, marcos com emoji, aporte × patrimônio
// × TSR ano a ano até bater R$ 6 milhões. Cada card/linha entra em cascata
// (animation-delay crescente) — é o "prazer de navegar" pedido.
export function PlanoRevelado({
  aporteMensal,
  rentabilidade,
  crescimentoAporte,
  simulacao,
}: {
  aporteMensal: number;
  rentabilidade: number;
  crescimentoAporte: number;
  simulacao: PontoProjecao[];
}) {
  const ano6M = anoDoMarco(simulacao, 6_000_000);
  const linhas = ano6M ? simulacao.filter((p) => p.ano <= ano6M) : simulacao;

  return (
    <div
      style={{ animation: "fade-slide-in 0.4s ease-out both" }}
      className="overflow-hidden rounded-[16px] border border-bank-primaria/30 bg-bank-primaria-bg/40 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl" aria-hidden>🚀</span>
        <div>
          <p className="text-base font-semibold text-text-primary">Plano rumo aos R$ 6 milhões</p>
          <p className="text-xs text-text-secondary">
            {brl(aporteMensal)}/mês, crescendo {crescimentoAporte}% ao ano, a {rentabilidade}% a.a.
            {ano6M && (
              <>
                {" "}
                — chega lá em <span className="font-semibold text-bank-primaria">{ano6M}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Marcos */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {MARCOS_PLANO.map((marco, i) => {
          const ano = anoDoMarco(simulacao, marco);
          return (
            <div
              key={marco}
              style={{ animation: "fade-slide-in 0.35s ease-out both", animationDelay: `${i * 80}ms` }}
              className="rounded-[10px] border border-border bg-surface-1 p-2 text-center"
            >
              <p className="text-lg leading-none" aria-hidden>{EMOJI_MARCO[marco]}</p>
              <p className="mt-1 text-[11px] text-text-faint">{brlCompacto(marco)}</p>
              <p className="text-xs font-semibold text-text-primary">{ano ?? "—"}</p>
            </div>
          );
        })}
      </div>

      {/* Ano a ano até a meta */}
      <div className="mt-4 max-h-72 overflow-y-auto rounded-[10px] border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="text-left text-xs text-text-faint">
              <th className="px-3 py-2 font-medium">Ano</th>
              <th className="px-3 py-2 text-right font-medium">💵 Aporte/mês</th>
              <th className="px-3 py-2 text-right font-medium">Patrimônio</th>
              <th className="px-3 py-2 text-right font-medium">💰 TSR/mês</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.map((p, i) => (
              <tr
                key={p.ano}
                style={{ animation: "fade-slide-in 0.3s ease-out both", animationDelay: `${Math.min(i * 30, 900)}ms` }}
              >
                <td className="px-3 py-2 font-medium">{p.ano}</td>
                <td className="px-3 py-2 text-right text-text-secondary numeros-tabulares">
                  {brl(aporteMensal * Math.pow(1 + crescimentoAporte / 100, i))}
                </td>
                <td className="px-3 py-2 text-right font-semibold numeros-tabulares">{brl(p.valor)}</td>
                <td className="px-3 py-2 text-right text-bank-positivo numeros-tabulares">
                  {brl(tsrMensal(p.valor))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{ animation: "fade-slide-in 0.35s ease-out both", animationDelay: "200ms" }}
        className="mt-4 flex items-center gap-2 rounded-[10px] bg-bank-positivo-bg px-3 py-2.5 text-sm"
      >
        <span className="text-lg" aria-hidden>💰</span>
        <span className="font-medium text-bank-positivo">
          Ao bater a meta, R$ {tsrMensal(linhas[linhas.length - 1]?.valor ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          /mês de renda estimada ({TSR_ANUAL_PCT}% a.a. sobre o patrimônio)
        </span>
      </div>
    </div>
  );
}
