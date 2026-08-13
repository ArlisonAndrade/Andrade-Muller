"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { salvarParametrosPlano } from "@/lib/bank/acoes/planos";

// Meta editável em R$ de uma finalidade (hoje só a Reserva — a do Arthur
// vem do simulador em /bank/arthur, não é digitada aqui). Mesmo padrão do
// MetaEditavel de Semanas, reaproveitando o salvarParametrosPlano genérico.
export function MetaFinalidadeEditavel({
  entidadeId,
  chave,
  meta,
  caminho,
}: {
  entidadeId: string;
  chave: string;
  meta: number;
  caminho: string;
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="text-xs text-text-faint underline decoration-dotted underline-offset-2 hover:text-text-primary"
      >
        meta {moedaBRL(meta)} · editar
      </button>
    );
  }

  return (
    <form action={salvarParametrosPlano} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="entidade_id" value={entidadeId} />
      <input type="hidden" name="caminho" value={caminho} />
      <input
        name={`param_${chave}`}
        type="number"
        step="100"
        min="0"
        defaultValue={meta}
        autoFocus
        className="w-24 rounded-[6px] border border-border bg-surface-2 px-2 py-1 text-right text-xs outline-none"
        aria-label="Meta em reais"
      />
      <button
        type="submit"
        onClick={() => setEditando(false)}
        className="rounded-[6px] bg-bank-primaria px-2 py-1 text-xs font-medium text-white"
      >
        salvar
      </button>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="rounded-[6px] border border-border px-2 py-1 text-xs text-text-secondary"
      >
        cancelar
      </button>
    </form>
  );
}
