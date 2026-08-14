"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { editarRecorrencia, alternarRecorrencia } from "@/lib/bank/acoes/recorrencias";

type CategoriaOpcao = { id: string; nome: string };
type Recorrencia = {
  id: string;
  descricao: string;
  valor: number;
  dia_do_mes: number;
  ativa: boolean;
  categoria_id: string | null;
  categoria: { nome: string } | null;
};

export function ItemRecorrencia({
  recorrencia: r,
  categorias,
}: {
  recorrencia: Recorrencia;
  categorias: CategoriaOpcao[];
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <form
        action={async (formData) => {
          await editarRecorrencia(formData);
          setEditando(false);
        }}
        className="grid grid-cols-2 gap-2 rounded-[8px] border border-border bg-surface-2 p-3 sm:grid-cols-6"
      >
        <input type="hidden" name="id" value={r.id} />
        <input
          name="descricao"
          defaultValue={r.descricao}
          required
          className="col-span-2 rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-2"
        />
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={r.valor}
          required
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none"
        />
        <input
          name="dia_do_mes"
          type="number"
          min="1"
          max="28"
          defaultValue={r.dia_do_mes}
          required
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none"
        />
        <select
          name="categoria_id"
          defaultValue={r.categoria_id ?? ""}
          className="rounded-[8px] border border-border bg-surface-1 px-2 py-2 text-sm outline-none"
        >
          <option value="">Categoria —</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-6">
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
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={`truncate text-sm ${r.ativa ? "text-text-primary" : "text-text-faint line-through"}`}>
          {r.descricao}
        </p>
        <p className="text-xs text-text-faint">
          dia {r.dia_do_mes} · {r.categoria?.nome ?? "sem categoria"} · {moedaBRL(Number(r.valor))}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary"
        >
          Editar
        </button>
        <form action={alternarRecorrencia}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="ativa" value={String(r.ativa)} />
          <button
            type="submit"
            className={`rounded-full border px-3 py-1 text-xs ${
              r.ativa ? "border-border text-text-secondary" : "border-bank-primaria text-bank-primaria"
            }`}
          >
            {r.ativa ? "Pausar" : "Reativar"}
          </button>
        </form>
      </div>
    </div>
  );
}
