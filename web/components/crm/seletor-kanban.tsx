"use client";

import { useTransition } from "react";

// Select compacto no rodapé do cartão — substitui drag-and-drop no MVP.
export function SeletorKanban({
  valor,
  opcoes,
  aoMudar,
}: {
  valor: string;
  opcoes: readonly { valor: string; rotulo: string }[];
  aoMudar: (novo: string) => Promise<void>;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <select
      value={valor}
      disabled={pendente}
      onChange={(e) => startTransition(() => aoMudar(e.target.value))}
      className="mt-2 w-full rounded-md border border-divider bg-parchment/60 px-1.5 py-1 text-xs text-ink-soft outline-none disabled:opacity-50"
    >
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}
