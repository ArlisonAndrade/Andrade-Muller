"use client";

import { useTransition } from "react";

export function BotaoExcluir({ aoConfirmar }: { aoConfirmar: () => Promise<void> }) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (window.confirm("Excluir de vez? Essa ação não tem volta.")) {
          startTransition(() => aoConfirmar());
        }
      }}
      className="text-sm text-terracota hover:underline disabled:opacity-50"
    >
      {pendente ? "Excluindo…" : "Excluir"}
    </button>
  );
}
