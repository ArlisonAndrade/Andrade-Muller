"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { salvarFatiaCategoria } from "@/lib/bank/acoes/semanas";

export type LinhaCategoria = {
  categoriaId: string;
  nome: string;
  gasto: number;
  alvo: number | null;
  percentualAlvo: number | null;
  media: number | null;
};

// Cada categoria da semana: quanto saiu, quanto era a fatia, e como isso se
// compara ao normal dela. O percentual é editável inline — é aqui que a
// divisão dos R$1.600 deixa de ser chute e vira o plano da família.
export function PlanoCategorias({
  linhas,
  entidadeId,
  metaTotal,
}: {
  linhas: LinhaCategoria[];
  entidadeId: string;
  metaTotal: number | null;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const somaPercentual = linhas.reduce((s, l) => s + (l.percentualAlvo ?? 0), 0);

  async function salvar(formData: FormData) {
    const r = await salvarFatiaCategoria(formData);
    setErro(r?.erro ?? null);
    if (!r?.erro) setEditando(null);
  }

  return (
    <section className="card-bank p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Onde a semana está indo</h2>
        <span
          className={`text-xs ${
            somaPercentual > 100 ? "text-bank-negativo" : "text-text-faint"
          }`}
        >
          plano soma {somaPercentual.toFixed(0)}%
          {somaPercentual > 100 && " — acima de 100%"}
        </span>
      </div>

      {erro && <p className="mt-2 text-xs text-bank-negativo">{erro}</p>}

      <div className="mt-4 flex flex-col divide-y divide-border">
        {linhas.length === 0 && (
          <p className="py-6 text-sm text-text-faint">
            Nenhum gasto nesta semana ainda.
          </p>
        )}

        {linhas.map((l) => {
          const percentualUsado = l.alvo && l.alvo > 0 ? (l.gasto / l.alvo) * 100 : null;
          const estourou = percentualUsado != null && percentualUsado > 100;
          const acimaDoNormal = l.media != null && l.media > 0 && l.gasto > l.media * 1.3;

          return (
            <div key={l.categoriaId} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-text-primary">{l.nome}</span>
                <span className="shrink-0 text-sm font-medium text-text-primary numeros-tabulares">
                  {moedaBRL(l.gasto)}
                  {l.alvo != null && (
                    <span className="text-text-faint"> / {moedaBRL(l.alvo)}</span>
                  )}
                </span>
              </div>

              {l.alvo != null && (
                <div className="mt-1.5">
                  <ProgressBar
                    percentual={Math.min(100, percentualUsado ?? 0)}
                    cor={
                      estourou
                        ? "var(--color-bank-negativo)"
                        : "var(--color-bank-positivo)"
                    }
                  />
                </div>
              )}

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className={acimaDoNormal ? "text-bank-negativo" : "text-text-faint"}>
                  {l.media != null
                    ? `normal desta categoria: ${moedaBRL(l.media)}/semana`
                    : "sem semana fechada para comparar ainda"}
                  {acimaDoNormal && " — acima do normal"}
                </span>

                {editando === l.categoriaId ? (
                  <form action={salvar} className="flex items-center gap-1.5">
                    <input type="hidden" name="entidade_id" value={entidadeId} />
                    <input type="hidden" name="categoria_id" value={l.categoriaId} />
                    <input
                      name="percentual"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      defaultValue={l.percentualAlvo ?? 0}
                      autoFocus
                      className="w-16 rounded-[6px] border border-border bg-surface-2 px-2 py-1 text-right text-xs outline-none"
                      aria-label={`Fatia de ${l.nome} em porcentagem`}
                    />
                    <span className="text-text-faint">%</span>
                    <button
                      type="submit"
                      className="rounded-[6px] bg-bank-primaria px-2 py-1 text-xs font-medium text-white"
                    >
                      ok
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      className="rounded-[6px] border border-border px-2 py-1 text-xs text-text-secondary"
                    >
                      cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditando(l.categoriaId)}
                    className="rounded-[6px] border border-border px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    {l.percentualAlvo != null
                      ? `${l.percentualAlvo}% do plano`
                      : "definir fatia"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {metaTotal == null && (
        <p className="mt-3 text-xs text-text-faint">
          Sem meta semanal cadastrada, as fatias não viram valor em reais.
        </p>
      )}
    </section>
  );
}
