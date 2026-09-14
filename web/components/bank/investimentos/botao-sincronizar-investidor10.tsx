"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acaoSincronizarInvestidor10 } from "@/lib/bank/acoes/investimentos";
import { IconRefresh } from "@/components/bank/ui/icones";

// Embaixo do botão fica só a data da última sincronização (decisão do
// Arlison, 14/set/2026 — a lista do que mudou poluía a tela; ela continua
// gravada em sincronizacoes_investidor10.alteracoes). Falha, essa sim, aparece
// com o motivo: o botão da brapi engolia o erro e por 6 semanas pareceu só
// "não funcionar".
export function BotaoSincronizarInvestidor10({ ultimaSync }: { ultimaSync: string | null }) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function sincronizar() {
    setRodando(true);
    setErro(null);
    try {
      const resultado = await acaoSincronizarInvestidor10();
      if (!resultado.ok) setErro(resultado.erro ?? "Falha ao sincronizar.");
      // Refaz a página: a data da última sincronização vem do servidor.
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao sincronizar.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sincronizar}
        disabled={rodando}
        className="flex items-center gap-1.5 rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-60"
      >
        <IconRefresh size={16} stroke={1.8} /> {rodando ? "Sincronizando…" : "Sincronizar com Investidor10"}
      </button>
      {erro ? (
        <p className="max-w-sm text-right text-xs text-bank-negativo">Falhou: {erro}</p>
      ) : (
        ultimaSync && <p className="text-right text-xs text-text-faint">{ultimaSync}</p>
      )}
    </div>
  );
}
