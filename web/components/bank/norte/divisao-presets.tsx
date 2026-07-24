"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { selecionarDivisaoPreset, salvarDivisaoPersonalizada } from "@/lib/bank/acoes/norte";
import { PRESETS_DIVISAO, type DivisaoConfig } from "@/lib/bank/tipos";

export function DivisaoPresets({
  entidadeId,
  config,
  rendaTotal,
}: {
  entidadeId: string;
  config: DivisaoConfig;
  rendaTotal: number;
}) {
  const [personalizando, setPersonalizando] = useState(config.preset === "personalizada");

  return (
    <section className="card-bank p-4 sm:p-5">
      <h2 className="mb-1 text-sm font-semibold">Divisão 50/30/20</h2>
      <p className="mb-3 text-xs text-text-faint">
        Escolha como dividir os {moedaBRL(rendaTotal)} da família — ou crie a sua.
      </p>

      <div className="flex flex-col gap-2">
        {PRESETS_DIVISAO.map((p) => {
          const ativo = config.preset === p.valor;
          return (
            <form key={p.valor} action={selecionarDivisaoPreset}>
              <input type="hidden" name="entidade_id" value={entidadeId} />
              <input type="hidden" name="preset" value={p.valor} />
              <button
                type="submit"
                className={`w-full rounded-[10px] border p-3 text-left transition-colors ${
                  ativo ? "border-bank-primaria bg-bank-primaria-bg" : "border-border hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">{p.nome}</span>
                  {ativo && (
                    <span className="rounded-full bg-bank-primaria px-2 py-0.5 text-[10px] font-medium text-white">
                      ativa
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-faint">{p.descricao}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  {p.pct_essencial}% variável ({moedaBRL((rendaTotal * p.pct_essencial) / 100)}) ·{" "}
                  {p.pct_liberdade}% fixa ({moedaBRL((rendaTotal * p.pct_liberdade) / 100)}) ·{" "}
                  {p.pct_investimento}% investimento ({moedaBRL((rendaTotal * p.pct_investimento) / 100)})
                </p>
              </button>
            </form>
          );
        })}

        {/* Personalizada */}
        <div
          className={`rounded-[10px] border p-3 ${
            config.preset === "personalizada" ? "border-bank-primaria bg-bank-primaria-bg" : "border-border"
          }`}
        >
          <button
            type="button"
            onClick={() => setPersonalizando((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="text-sm font-medium text-text-primary">Personalizada</span>
            {config.preset === "personalizada" && (
              <span className="rounded-full bg-bank-primaria px-2 py-0.5 text-[10px] font-medium text-white">
                ativa
              </span>
            )}
          </button>
          {personalizando && (
            <form action={salvarDivisaoPersonalizada} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="entidade_id" value={entidadeId} />
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  Variável %
                  <input
                    name="pct_essencial"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={config.pct_essencial}
                    className="rounded-[8px] border border-border bg-surface-1 px-2 py-1.5 text-sm outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  Fixa %
                  <input
                    name="pct_liberdade"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={config.pct_liberdade}
                    className="rounded-[8px] border border-border bg-surface-1 px-2 py-1.5 text-sm outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  Investimento %
                  <input
                    name="pct_investimento"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={config.pct_investimento}
                    className="rounded-[8px] border border-border bg-surface-1 px-2 py-1.5 text-sm outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-2 flex flex-col gap-1 text-xs text-text-secondary">
                  4ª categoria (opcional)
                  <input
                    name="extra_nome"
                    type="text"
                    placeholder="ex. Reserva de emergência"
                    defaultValue={config.extra_nome ?? ""}
                    className="rounded-[8px] border border-border bg-surface-1 px-2 py-1.5 text-sm outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  %
                  <input
                    name="pct_extra"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={config.pct_extra}
                    className="rounded-[8px] border border-border bg-surface-1 px-2 py-1.5 text-sm outline-none"
                  />
                </label>
              </div>
              <p className="text-[11px] text-text-faint">
                As porcentagens (incluindo a 4ª, se usar) precisam somar 100%.
              </p>
              <button
                type="submit"
                className="self-start rounded-[8px] bg-bank-primaria px-3 py-1.5 text-xs font-medium text-white"
              >
                Salvar divisão personalizada
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
