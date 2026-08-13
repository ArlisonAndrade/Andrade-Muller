"use client";

import { useState } from "react";
import { LinhaItem, FormAdicionarItem, type ItemView } from "@/components/bank/norte/tabela-divisao";
import { IconUser, IconArrowsExchange, IconChevronDown } from "@/components/bank/ui/icones";
import { ValorMoeda } from "@/components/bank/norte/privacidade";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import type { Pessoa } from "@/lib/bank/tipos";

type Opcao = { id: string; nome: string };

export function CardsResponsavel({
  entidadeId,
  pessoas,
  itens,
  categorias,
  cartoes,
}: {
  entidadeId: string;
  pessoas: Pessoa[];
  itens: ItemView[];
  categorias: Opcao[];
  cartoes: Opcao[];
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const opcoesPessoas = pessoas.map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <section className="card-bank p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold">Divisão dos pagamentos — por responsável</h2>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {pessoas.map((p) => {
          const itensPessoa = itens.filter((i) => i.responsavel_id === p.id);
          const paga = itensPessoa.reduce((s, i) => s + i.valor, 0);
          const recebe = Number(p.renda_base);
          const pct = recebe > 0 ? (paga / recebe) * 100 : paga > 0 ? 999 : 0;
          const estourou = pct > 100;
          const aTransferir = itensPessoa
            .filter((i) => i.transferencia)
            .reduce((s, i) => s + i.valor, 0);
          const expandido = aberto === p.id;
          const cor = p.cor ?? "var(--color-bank-primaria)";

          return (
            <div key={p.id} className="overflow-hidden rounded-[12px] border border-border">
              <button
                type="button"
                onClick={() => setAberto(expandido ? null : p.id)}
                className="flex w-full flex-col gap-4 p-4 text-left sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3"
                      style={{ color: cor }}
                    >
                      <IconUser size={18} stroke={1.8} />
                    </span>
                    <span className="text-sm font-semibold text-text-primary">{p.nome}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      estourou
                        ? "bg-bank-negativo-bg text-bank-negativo"
                        : "bg-surface-3 text-text-secondary"
                    }`}
                  >
                    {pct.toFixed(0)}% da renda
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text-faint">recebe</p>
                    <p className="mt-1 text-base font-semibold text-bank-positivo">
                      <ValorMoeda valor={recebe} />
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-faint">paga</p>
                    <p className="mt-1 text-base font-semibold text-bank-primaria">
                      <ValorMoeda valor={paga} />
                    </p>
                  </div>
                </div>

                <ProgressBar
                  percentual={pct}
                  cor={estourou ? "var(--color-bank-negativo)" : "var(--color-bank-primaria)"}
                />

                {aTransferir > 0 && (
                  <p className="flex items-center gap-2 rounded-[8px] bg-surface-2 px-3 py-2.5 text-xs text-text-secondary">
                    <IconArrowsExchange size={16} stroke={1.8} className="shrink-0 text-text-faint" />
                    <span>
                      transfere{" "}
                      <span className="font-medium text-text-primary">
                        <ValorMoeda valor={aTransferir} />
                      </span>{" "}
                      pro Arlison
                    </span>
                  </p>
                )}

                <span className="flex items-center gap-1 text-xs font-medium text-bank-primaria">
                  {expandido ? "Ocultar detalhes" : "Ver detalhes"}
                  <IconChevronDown
                    size={14}
                    stroke={2}
                    className={`transition-transform ${expandido ? "rotate-180" : ""}`}
                  />
                </span>
              </button>

              {expandido && (
                <div className="border-t border-border p-3 sm:p-4">
                  {itensPessoa.length === 0 && (
                    <p className="py-4 text-center text-xs text-text-faint">Nenhum item ainda.</p>
                  )}
                  <div className="flex flex-col divide-y divide-border">
                    {itensPessoa.map((i) => (
                      <div key={i.id} className="py-1 first:pt-0 last:pb-0">
                        <LinhaItem
                          item={i}
                          pessoas={opcoesPessoas}
                          categorias={categorias}
                          cartoes={cartoes}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <FormAdicionarItem
                      entidadeId={entidadeId}
                      pessoas={opcoesPessoas}
                      categorias={categorias}
                      cartoes={cartoes}
                      defaultsIniciais={{ responsavel_id: p.id }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
