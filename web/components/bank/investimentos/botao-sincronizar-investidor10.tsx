"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acaoSincronizarInvestidor10 } from "@/lib/bank/acoes/investimentos";
import type { ResultadoSync } from "@/lib/bank/investidor10";
import { IconRefresh } from "@/components/bank/ui/icones";

function descreverAlteracoes(r: ResultadoSync) {
  if (r.alteracoes.length === 0) return "Posições iguais; valores atualizados.";
  return r.alteracoes
    .map((a) => {
      const fmt = (v: number | null) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 6 });
      if (a.campo === "novo") return `${a.ticker}: novo`;
      if (a.campo === "zerado") return `${a.ticker}: vendido`;
      if (a.campo === "quantidade") return `${a.ticker}: ${fmt(a.antes)} → ${fmt(a.depois)}`;
      return `${a.ticker}: aplicado R$ ${fmt(a.antes)} → R$ ${fmt(a.depois)}`;
    })
    .join(" · ");
}

// O botão diz o que houve. O da brapi chamava a action direto e engolia o
// erro — por 6 semanas pareceu só "não funcionar".
export function BotaoSincronizarInvestidor10({ ultimaSync }: { ultimaSync: string | null }) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSync | null>(null);

  async function sincronizar() {
    setRodando(true);
    setResultado(null);
    try {
      setResultado(await acaoSincronizarInvestidor10());
      router.refresh();
    } catch (e) {
      setResultado({
        ok: false,
        erro: e instanceof Error ? e.message : "Falha ao sincronizar.",
        aplicado: null,
        patrimonio: null,
        ativos: 0,
        alteracoes: [],
      });
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
      {resultado ? (
        <p className={`max-w-sm text-right text-xs ${resultado.ok ? "text-text-faint" : "text-bank-negativo"}`}>
          {resultado.ok
            ? `${resultado.ativos} ativos · ${descreverAlteracoes(resultado)}`
            : `Falhou: ${resultado.erro}`}
        </p>
      ) : (
        ultimaSync && <p className="text-right text-xs text-text-faint">{ultimaSync}</p>
      )}
    </div>
  );
}
