"use client";

import { useState } from "react";
import { moedaBRL, dataBR } from "@/lib/bank/formato";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import type { SemanaResumo } from "@/lib/bank/semanas";

// Lista das semanas fechadas, no formato que o Arlison já lia na planilha
// (Smn 01…Smn 15). Clicar abre o resumo daquela semana ali mesmo — sem
// navegar pra outra página, porque a graça é comparar uma com a outra.
export function ListaSemanas({ semanas }: { semanas: SemanaResumo[] }) {
  const [aberta, setAberta] = useState<string | null>(null);

  if (semanas.length === 0) {
    return (
      <section className="card-bank p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Semanas fechadas</h2>
        <p className="mt-2 text-sm text-text-faint">
          Nenhuma semana fechada ainda.
        </p>
      </section>
    );
  }

  const dentro = semanas.filter((s) => s.meta != null && s.gasto <= s.meta).length;

  return (
    <section className="card-bank p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Semanas fechadas</h2>
        <span className="text-xs text-text-faint">
          {dentro} de {semanas.length} dentro da meta
        </span>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-border">
        {[...semanas].reverse().map((s) => {
          const estourou = s.meta != null && s.gasto > s.meta;
          const diferenca = s.meta != null ? s.meta - s.gasto : null;
          const estaAberta = aberta === s.inicio;
          const comDetalhe = s.porCategoria.filter((c) => c.gasto > 0);

          return (
            <div key={s.inicio}>
              <button
                type="button"
                onClick={() => setAberta(estaAberta ? null : s.inicio)}
                aria-expanded={estaAberta}
                className="flex w-full items-baseline justify-between gap-3 py-3 text-left"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="text-sm font-medium text-text-primary">{s.rotulo}</span>
                  <span className="truncate text-xs text-text-faint">
                    {dataBR(s.inicio)} a {dataBR(s.fim)}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-sm font-medium numeros-tabulares ${
                    s.meta == null
                      ? "text-text-primary"
                      : estourou
                        ? "text-bank-negativo"
                        : "text-bank-positivo"
                  }`}
                >
                  {moedaBRL(s.gasto)}
                  {diferenca != null && (
                    <span className="ml-2 text-xs">
                      {diferenca >= 0 ? "−" : "+"}
                      {moedaBRL(Math.abs(diferenca)).replace("R$", "").trim()}
                    </span>
                  )}
                </span>
              </button>

              {estaAberta && (
                <div className="pb-4">
                  {s.meta != null && (
                    <>
                      <ProgressBar
                        percentual={Math.min(100, (s.gasto / s.meta) * 100)}
                        cor={
                          estourou
                            ? "var(--color-bank-negativo)"
                            : "var(--color-bank-positivo)"
                        }
                      />
                      <p className="mt-1.5 text-xs text-text-faint">
                        {moedaBRL(s.gasto)} de {moedaBRL(s.meta)} ·{" "}
                        {Math.round((s.gasto / s.meta) * 100)}% da meta
                      </p>
                    </>
                  )}

                  {comDetalhe.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {comDetalhe.map((c) => (
                        <div
                          key={c.categoriaId}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="min-w-0 truncate text-text-secondary">{c.nome}</span>
                          <span className="shrink-0 text-text-primary numeros-tabulares">
                            {moedaBRL(c.gasto)}
                            <span className="ml-2 text-text-faint">
                              {s.gasto > 0 ? `${Math.round((c.gasto / s.gasto) * 100)}%` : ""}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-text-faint">
                      Nesta semana só o total foi anotado — sem detalhe por
                      categoria.
                    </p>
                  )}

                  {s.porPessoa.length > 1 && (
                    <p className="mt-3 text-xs text-text-faint">
                      {s.porPessoa.map((p) => `${p.nome}: ${moedaBRL(p.total)}`).join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
