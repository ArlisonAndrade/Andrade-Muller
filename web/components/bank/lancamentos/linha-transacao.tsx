"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { editarLancamento, excluirLancamento } from "@/lib/bank/acoes/lancamento";

type Categoria = { id: string; nome: string };

export type LinhaTransacaoProps = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria_id: string | null;
  categoriaNome: string | null;
  receita: boolean;
  recorrente: boolean;
  detalhe: string | null;
  categorias: Categoria[];
};

export function LinhaTransacao({
  id,
  descricao,
  valor,
  data,
  categoria_id,
  categoriaNome,
  receita,
  recorrente,
  detalhe,
  categorias,
}: LinhaTransacaoProps) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Aguarda o server action terminar antes de fechar a edição — senão o
  // estado local fica preso e o form não reflete o valor recém-salvo.
  async function salvar(formData: FormData) {
    setSalvando(true);
    try {
      await editarLancamento(formData);
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <form
        action={salvar}
        className="grid grid-cols-2 gap-2 rounded-[10px] bg-surface-2 p-3 sm:grid-cols-12"
      >
        <input type="hidden" name="id" value={id} />
        <input
          name="descricao"
          defaultValue={descricao}
          required
          placeholder="Descrição"
          className="col-span-2 rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-4"
        />
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={valor}
          required
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-2"
        />
        <input
          name="data"
          type="date"
          defaultValue={data}
          required
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-3"
        />
        <select
          name="categoria_id"
          defaultValue={categoria_id ?? ""}
          className="rounded-[8px] border border-border bg-surface-1 px-2 py-2 text-sm outline-none sm:col-span-3"
        >
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-12">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-[8px] bg-bank-primaria px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-[8px] border border-border px-3 py-1.5 text-sm text-text-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            formAction={excluirLancamento}
            className="ml-auto rounded-[8px] border border-bank-negativo px-3 py-1.5 text-sm text-bank-negativo"
          >
            Excluir
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="min-w-0 flex-1 text-left"
        title="Editar"
      >
        <p className="truncate text-sm text-text-primary">
          {descricao}
          {recorrente && (
            <span className="ml-1.5 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] text-text-faint">
              recorrente
            </span>
          )}
        </p>
        <p className="text-xs text-text-faint">
          {categoriaNome ?? "Sem categoria"}
          {detalhe ? ` · ${detalhe}` : ""}
        </p>
      </button>
      <button
        type="button"
        onClick={() => setEditando(true)}
        className={`shrink-0 text-sm font-medium ${
          receita ? "text-bank-positivo" : "text-text-primary"
        }`}
        title="Editar"
      >
        {receita ? "+" : "−"} {moedaBRL(Number(valor))}
      </button>
    </div>
  );
}
