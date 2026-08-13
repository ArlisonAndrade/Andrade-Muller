"use client";

import { useState } from "react";
import { selecionarDivisaoPreset, salvarDivisaoPersonalizada } from "@/lib/bank/acoes/norte";
import { PRESETS_DIVISAO, type DivisaoConfig } from "@/lib/bank/tipos";
import { ValorMoeda } from "@/components/bank/norte/privacidade";
import { IconPencil, IconX } from "@/components/bank/ui/icones";

export function DivisaoPresets({
  entidadeId,
  config,
  rendaTotal,
}: {
  entidadeId: string;
  config: DivisaoConfig;
  rendaTotal: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [personalizando, setPersonalizando] = useState(config.preset === "personalizada");

  const presetAtivo = PRESETS_DIVISAO.find((p) => p.valor === config.preset);
  const nomeAtivo = presetAtivo?.nome ?? "Personalizada";
  const descricaoAtiva = presetAtivo?.descricao ?? "A divisão que vocês configuraram.";

  return (
    <section className="card-bank p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Divisão do orçamento</h2>
          <p className="mt-0.5 text-xs text-text-faint">
            Como os <ValorMoeda valor={rendaTotal} /> da família se dividem
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-2"
        >
          <IconPencil size={14} stroke={1.8} />
          Editar
        </button>
      </div>

      {/* Divisão ativa */}
      <div className="mt-4 rounded-[10px] border border-bank-primaria bg-bank-primaria-bg p-3">
        <p className="text-sm font-medium text-text-primary">{nomeAtivo}</p>
        <p className="mt-0.5 text-xs text-text-faint">{descricaoAtiva}</p>
        <p className="mt-1.5 text-xs text-text-secondary">
          {config.pct_essencial}% variável (<ValorMoeda valor={(rendaTotal * config.pct_essencial) / 100} />) ·{" "}
          {config.pct_liberdade}% fixa (<ValorMoeda valor={(rendaTotal * config.pct_liberdade) / 100} />) ·{" "}
          {config.pct_investimento}% investimento (
          <ValorMoeda valor={(rendaTotal * config.pct_investimento) / 100} />)
          {config.pct_extra > 0 && config.extra_nome && (
            <>
              {" "}
              · {config.pct_extra}% {config.extra_nome} (
              <ValorMoeda valor={(rendaTotal * config.pct_extra) / 100} />)
            </>
          )}
        </p>
      </div>

      {/* Janela de edição */}
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[16px] bg-surface-1 p-4 sm:rounded-[16px] sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Escolher divisão</h3>
                <p className="mt-0.5 text-xs text-text-faint">
                  Como dividir os <ValorMoeda valor={rendaTotal} /> da família.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2"
              >
                <IconX size={18} stroke={1.8} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {PRESETS_DIVISAO.map((p) => {
                const ativo = config.preset === p.valor;
                return (
                  <form key={p.valor} action={selecionarDivisaoPreset}>
                    <input type="hidden" name="entidade_id" value={entidadeId} />
                    <input type="hidden" name="preset" value={p.valor} />
                    <button
                      type="submit"
                      onClick={() => setAberto(false)}
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
                        {p.pct_essencial}% variável (<ValorMoeda valor={(rendaTotal * p.pct_essencial) / 100} />) ·{" "}
                        {p.pct_liberdade}% fixa (<ValorMoeda valor={(rendaTotal * p.pct_liberdade) / 100} />) ·{" "}
                        {p.pct_investimento}% investimento (
                        <ValorMoeda valor={(rendaTotal * p.pct_investimento) / 100} />)
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
                          className="rounded-[8px] border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none"
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
                          className="rounded-[8px] border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none"
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
                          className="rounded-[8px] border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none"
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
                          className="rounded-[8px] border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none"
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
                          className="rounded-[8px] border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-text-faint">
                      As porcentagens (incluindo a 4ª, se usar) precisam somar 100%.
                    </p>
                    <button
                      type="submit"
                      onClick={() => setAberto(false)}
                      className="self-start rounded-[8px] bg-bank-primaria px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Salvar divisão personalizada
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
