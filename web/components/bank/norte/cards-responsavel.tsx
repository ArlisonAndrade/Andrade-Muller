"use client";

import { useState } from "react";
import { LinhaItem, FormAdicionarItem, type ItemView } from "@/components/bank/norte/tabela-divisao";
import { IconUser } from "@/components/bank/ui/icones";
import { ValorMoeda } from "@/components/bank/norte/privacidade";
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
      <h2 className="mb-3 text-sm font-semibold">Divisão dos pagamentos — por responsável</h2>
      <div className="grid gap-3 sm:grid-cols-2">
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

          return (
            <div key={p.id} className="rounded-[10px] border border-border">
              <button
                type="button"
                onClick={() => setAberto(expandido ? null : p.id)}
                className="flex w-full flex-col gap-2 p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <IconUser size={16} stroke={1.8} style={{ color: p.cor ?? "var(--color-bank-primaria)" }} />
                    {p.nome}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      estourou ? "text-bank-negativo" : "text-text-secondary"
                    }`}
                  >
                    {pct.toFixed(0)}% da renda
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-bank-positivo">recebe <ValorMoeda valor={recebe} /></span>
                  <span className="text-bank-primaria">paga <ValorMoeda valor={paga} /></span>
                </div>
                {aTransferir > 0 && (
                  <p className="rounded-[8px] bg-surface-2 px-2 py-1.5 text-xs text-text-secondary">
                    transfere <span className="font-medium text-text-primary"><ValorMoeda valor={aTransferir} /></span> pro Arlison
                  </p>
                )}
                <span className="text-[11px] text-text-faint">
                  {expandido ? "ocultar detalhes" : "ver detalhes"}
                </span>
              </button>
              {expandido && (
                <div className="flex flex-col gap-1.5 border-t border-border p-3">
                  {itensPessoa.length === 0 && (
                    <p className="py-2 text-center text-xs text-text-faint">Nenhum item ainda.</p>
                  )}
                  {itensPessoa.map((i) => (
                    <LinhaItem
                      key={i.id}
                      item={i}
                      pessoas={opcoesPessoas}
                      categorias={categorias}
                      cartoes={cartoes}
                    />
                  ))}
                  <FormAdicionarItem
                    entidadeId={entidadeId}
                    pessoas={opcoesPessoas}
                    categorias={categorias}
                    cartoes={cartoes}
                    defaultsIniciais={{ responsavel_id: p.id }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
