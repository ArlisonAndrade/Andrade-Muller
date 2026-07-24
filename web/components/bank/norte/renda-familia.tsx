"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { atualizarRendaPessoa } from "@/lib/bank/acoes/norte";
import type { Pessoa } from "@/lib/bank/tipos";

function CardPessoa({ pessoa }: { pessoa: Pessoa }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <form
        action={atualizarRendaPessoa}
        className="flex flex-1 flex-col gap-2 rounded-[10px] border border-bank-primaria bg-surface-2 p-4"
      >
        <input type="hidden" name="id" value={pessoa.id} />
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: pessoa.cor ?? "var(--color-bank-primaria)" }}
          />
          <span className="text-sm font-medium text-text-primary">{pessoa.nome}</span>
        </div>
        <input
          name="renda_base"
          type="number"
          step="0.01"
          min="0"
          autoFocus
          defaultValue={Number(pessoa.renda_base)}
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-lg font-semibold outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-[8px] bg-bank-primaria px-3 py-1.5 text-xs font-medium text-white"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-[8px] border border-border px-3 py-1.5 text-xs text-text-secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="flex flex-1 flex-col gap-1 rounded-[10px] border border-border bg-surface-2 p-4 text-left transition-shadow hover:shadow-md"
    >
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: pessoa.cor ?? "var(--color-bank-primaria)" }}
        />
        {pessoa.nome}
      </span>
      <span className="font-serif text-2xl font-medium text-text-primary">
        {moedaBRL(Number(pessoa.renda_base))}
      </span>
      <span className="text-[11px] text-text-faint">toque para editar</span>
    </button>
  );
}

export function RendaFamilia({ pessoas }: { pessoas: Pessoa[] }) {
  const total = pessoas.reduce((s, p) => s + Number(p.renda_base), 0);

  return (
    <section className="card-bank p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold">Renda da família</h2>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          {pessoas.map((p) => (
            <CardPessoa key={p.id} pessoa={p} />
          ))}
        </div>
        <span className="hidden text-xl text-text-faint sm:block">=</span>
        <div className="flex flex-col items-center justify-center rounded-[10px] bg-bank-primaria-bg p-4 sm:w-44">
          <span className="text-xs text-text-secondary">Total mensal</span>
          <span className="font-serif text-2xl font-semibold text-bank-primaria">
            {moedaBRL(total)}
          </span>
        </div>
      </div>
    </section>
  );
}
