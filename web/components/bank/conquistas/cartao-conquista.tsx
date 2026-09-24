"use client";

import { useEffect, useState } from "react";
import type { EstadoConquista } from "@/lib/bank/conquistas";
import { Medalha } from "@/components/bank/conquistas/medalha";

const NIVEL_ROTULO = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante" } as const;

const dataBR = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
const mesAno = (iso: string) => {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
};

// Linha curta embaixo do nome: data do fato, ou o quanto falta. O Fim do
// Santander (selo em construção) mostra as parcelas pagas.
function legenda(e: EstadoConquista) {
  if (e.conquistada && e.data) return dataBR(e.data);
  if (e.selo) {
    const pagas = Number(e.detalhe?.pagas ?? 0);
    const total = Number(e.detalhe?.total ?? 0);
    const prevista = e.detalhe?.quitacaoPrevista as string | null | undefined;
    return `${pagas} de ${total} parcelas${prevista ? ` · ${mesAno(prevista)}` : ""}`;
  }
  return null;
}

// Card de medalha da vitrine, clicável: abre o detalhe em tela (medalha
// grande, nome, data ou progresso). Selos da história usam o mesmo card, só
// maiores e com destaque — texto continua só título e data (decisão do Arlison).
export function CartaoConquista({ estado: e, destaque = false }: { estado: EstadoConquista; destaque?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const historia = !!e.selo;
  const texto = legenda(e);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (ev: KeyboardEvent) => ev.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title={historia ? e.nome : `${e.nome} (${NIVEL_ROTULO[e.nivel]}) — ${e.descricao}`}
        className={`flex flex-col items-center gap-1.5 rounded-[10px] border text-center transition hover:-translate-y-0.5 hover:shadow-md ${
          destaque
            ? "w-full border-bank-primaria/30 bg-surface-1 p-3 shadow-sm sm:w-44"
            : e.conquistada
              ? "border-border bg-surface-1 p-2.5"
              : "border-dashed border-border bg-surface-2 p-2.5"
        }`}
      >
        <Medalha
          emoji={e.emoji}
          nivel={e.nivel}
          selo={e.selo}
          bloqueada={!e.conquistada}
          progresso={e.progresso}
          tamanho={destaque ? 72 : 48}
        />
        <p
          className={`font-medium leading-tight ${destaque ? "text-sm" : "text-[11px]"} ${
            e.conquistada || historia ? "text-text-primary" : "text-text-faint"
          }`}
        >
          {e.nome}
        </p>
        {texto ? (
          <p className={`${destaque ? "text-xs" : "text-[10px]"} ${e.conquistada ? "text-bank-positivo" : "text-text-secondary"}`}>
            {texto}
          </p>
        ) : (
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-text-faint" style={{ width: `${e.progresso}%` }} />
          </div>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={e.nome}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-[20px] bg-surface-1 p-6 text-center shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
            style={{ animation: "fade-slide-in 0.25s ease-out both" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-bank-primaria">
              {historia ? "De onde viemos" : e.conquistada ? "Conquista" : "A conquistar"}
            </p>
            <div className="my-6 flex justify-center">
              <Medalha
                emoji={e.emoji}
                nivel={e.nivel}
                selo={e.selo}
                bloqueada={!e.conquistada}
                progresso={e.progresso}
                tamanho={120}
              />
            </div>
            <p className="text-xl font-semibold text-text-primary">{e.nome}</p>
            {!historia && <p className="mt-1 text-xs text-text-faint">{NIVEL_ROTULO[e.nivel]}</p>}
            {texto && <p className="mt-2 text-sm text-text-secondary">{texto}</p>}
            {!historia && <p className="mt-2 text-sm text-text-secondary">{e.descricao}</p>}
            {!e.conquistada && (
              <div className="mx-auto mt-4 max-w-[220px]">
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-bank-primaria" style={{ width: `${e.progresso}%` }} />
                </div>
                <p className="mt-1 text-xs text-text-faint">{Math.round(e.progresso)}%</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-6 w-full rounded-[10px] bg-bank-primaria px-4 py-2.5 text-sm font-medium text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
