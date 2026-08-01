"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { salvarMetaSemana } from "@/lib/bank/acoes/semanas";

// A meta vale da semana editada em diante (as seguintes herdam), então o
// texto diz isso — senão parece que só mudou esta semana.
export function MetaEditavel({
  entidadeId,
  semanaInicio,
  meta,
}: {
  entidadeId: string;
  semanaInicio: string;
  meta: number | null;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(formData: FormData) {
    const r = await salvarMetaSemana(formData);
    setErro(r?.erro ?? null);
    if (!r?.erro) setEditando(false);
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="text-xs text-text-faint underline decoration-dotted underline-offset-2 hover:text-text-primary"
      >
        meta {meta != null ? moedaBRL(meta) : "não definida"} · editar
      </button>
    );
  }

  return (
    <form action={salvar} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="entidade_id" value={entidadeId} />
      <input type="hidden" name="semana_inicio" value={semanaInicio} />
      <input
        name="meta"
        type="number"
        step="10"
        min="0"
        defaultValue={meta ?? 1600}
        autoFocus
        className="w-24 rounded-[6px] border border-border bg-surface-2 px-2 py-1 text-right text-xs outline-none"
        aria-label="Meta da semana em reais"
      />
      <button
        type="submit"
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
      <span className="w-full text-[11px] text-text-faint">
        vale desta semana em diante
      </span>
      {erro && <span className="w-full text-[11px] text-bank-negativo">{erro}</span>}
    </form>
  );
}
