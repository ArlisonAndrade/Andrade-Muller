"use client";

import { useTransition } from "react";

export function CheckboxTarefa({
  concluida,
  aoAlternar,
}: {
  concluida: boolean;
  aoAlternar: (concluida: boolean) => Promise<void>;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={concluida}
      disabled={pendente}
      onChange={(e) => {
        const marcada = e.target.checked;
        startTransition(() => aoAlternar(marcada));
      }}
      className="h-4 w-4 shrink-0 cursor-pointer accent-salvia disabled:opacity-50"
    />
  );
}
