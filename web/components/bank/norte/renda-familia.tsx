"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { atualizarRendaPessoa } from "@/lib/bank/acoes/norte";
import { IconUser } from "@/components/bank/ui/icones";
import type { Pessoa } from "@/lib/bank/tipos";

function CardPessoa({ pessoa }: { pessoa: Pessoa }) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // O action do form precisa aguardar o server action terminar antes de
  // fechar a edição — senão o estado local `editando` fica preso e o
  // <input> não-controlado não reflete o novo valor (parece que "não salvou").
  async function salvar(formData: FormData) {
    setSalvando(true);
    try {
      await atualizarRendaPessoa(formData);
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <form
        action={salvar}
        className="flex flex-1 flex-col gap-2 rounded-[10px] border border-bank-primaria bg-surface-2 p-4"
      >
        <input type="hidden" name="id" value={pessoa.id} />
        <div className="flex items-center gap-2">
          <IconUser size={16} stroke={1.8} style={{ color: pessoa.cor ?? "var(--color-bank-primaria)" }} />
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
            disabled={salvando}
            className="rounded-[8px] bg-bank-primaria px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
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
        <IconUser size={16} stroke={1.8} style={{ color: pessoa.cor ?? "var(--color-bank-primaria)" }} />
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
