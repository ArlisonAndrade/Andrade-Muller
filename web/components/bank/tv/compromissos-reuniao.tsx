"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarReuniaoTrimestral } from "@/lib/bank/acoes/reunioes";
import type { Compromisso } from "@/lib/bank/trimestre";

const ESTADOS: Array<{ valor: boolean | null; rotulo: string }> = [
  { valor: true, rotulo: "✓ cumprido" },
  { valor: false, rotulo: "✗ não cumprido" },
  { valor: null, rotulo: "—" },
];

// Fecho da reunião: confere o que foi combinado da última vez e registra o que
// fica combinado pro próximo trimestre. Salvo no banco — a reunião seguinte
// abre com esta lista.
export function CompromissosReuniao({
  trimestre,
  trimestreAnterior,
  rotuloProximo,
  anteriores,
  iniciais,
  notasIniciais,
  sugestoes,
}: {
  trimestre: string;
  trimestreAnterior: string;
  rotuloProximo: string;
  anteriores: Compromisso[];
  iniciais: Compromisso[];
  notasIniciais: string;
  sugestoes: string[];
}) {
  const router = useRouter();
  const [conferidos, setConferidos] = useState(anteriores);
  const [lista, setLista] = useState<string[]>(iniciais.length ? iniciais.map((c) => c.texto) : [""]);
  const [notas, setNotas] = useState(notasIniciais);
  const [estado, setEstado] = useState<"ocioso" | "salvo" | string>("ocioso");
  const [salvando, iniciar] = useTransition();

  const salvar = () =>
    iniciar(async () => {
      try {
        await salvarReuniaoTrimestral({
          trimestre,
          trimestreAnterior,
          compromissos: lista.map((texto) => ({ texto, cumprido: null })),
          notas,
          conferidos,
        });
        // Chamada de função cliente: sem o refresh a página não relê o banco
        // (a armadilha do `action=` anotada no CLAUDE.md).
        router.refresh();
        setEstado("salvo");
      } catch (e) {
        setEstado(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });

  const campo = "w-full rounded-[10px] border border-white/20 bg-white/10 px-3 py-2 text-base text-white placeholder:text-white/40 outline-none focus:border-white/60";

  return (
    <div className="flex flex-col gap-6">
      {conferidos.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-white/70">Combinamos da última vez</p>
          <ul className="flex flex-col gap-2">
            {conferidos.map((c, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-[10px] bg-white/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-base text-white">{c.texto}</span>
                <span className="flex shrink-0 gap-1">
                  {ESTADOS.map((e) => (
                    <button
                      key={String(e.valor)}
                      type="button"
                      onClick={() => setConferidos((l) => l.map((x, j) => (j === i ? { ...x, cumprido: e.valor } : x)))}
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        c.cumprido === e.valor ? "bg-white text-slate-900" : "bg-white/10 text-white/80"
                      }`}
                    >
                      {e.rotulo}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-white/70">Combinado para o {rotuloProximo}</p>
        <div className="flex flex-col gap-2">
          {lista.map((texto, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={campo}
                value={texto}
                placeholder="Ex.: aportar todo dia 5, antes de qualquer gasto"
                onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button
                type="button"
                onClick={() => setLista((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : [""]))}
                aria-label="Remover compromisso"
                className="rounded-[10px] bg-white/10 px-3 text-white/70 hover:bg-white/20"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLista((l) => [...l, ""])}
            className="rounded-full bg-white/15 px-3 py-1 text-xs text-white hover:bg-white/25"
          >
            + compromisso
          </button>
          {sugestoes
            .filter((s) => !lista.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLista((l) => [...l.filter((x) => x.trim()), s])}
                className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                + {s}
              </button>
            ))}
        </div>
      </div>

      <textarea
        className={`${campo} min-h-20`}
        value={notas}
        placeholder="Notas da reunião (opcional)"
        onChange={(e) => setNotas(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded-[10px] bg-white px-5 py-2.5 text-base font-semibold text-slate-900 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar a reunião"}
        </button>
        {estado === "salvo" && <span className="text-sm text-emerald-300">✓ Salvo. A próxima reunião abre com isso.</span>}
        {estado !== "salvo" && estado !== "ocioso" && <span className="text-sm text-red-300">{estado}</span>}
      </div>
    </div>
  );
}
