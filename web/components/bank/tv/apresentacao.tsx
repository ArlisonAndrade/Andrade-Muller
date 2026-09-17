"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

export type SlideTv = {
  titulo: string;
  emoji: string;
  fundo: string;
  conteudo: ReactNode;
  /** Capa: sem título grande, com o botão que entra em tela cheia. */
  capa?: boolean;
};

const AVANCAR = new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"]);
const VOLTAR = new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace"]);

// Modo TV como apresentação de verdade (decisão do Arlison, 17/set/2026): um
// só, aberto pela home, em tela cheia, conduzido com passador de slides.
//
// Passadores comuns mandam setas ou Page Up/Down — todas funcionam, sem
// configurar nada. B ou "." escurece a tela (pausa pra conversa); Esc sai da
// tela cheia (o próprio navegador cuida). O mouse some parado, e a barra de
// progresso fica fina embaixo. Setas dentro de campo de texto (compromissos)
// movem o cursor, não o slide.
export function Apresentacao({ slides, rodape }: { slides: SlideTv[]; rodape?: ReactNode }) {
  const [indice, setIndice] = useState(0);
  const [escuro, setEscuro] = useState(false);
  const [mouseAtivo, setMouseAtivo] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);
  const total = slides.length;

  const ir = useCallback((i: number) => setIndice(Math.max(0, Math.min(total - 1, i))), [total]);
  const entrarTelaCheia = useCallback(() => {
    const el = raiz.current;
    if (el && !document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable)) return;
      if (e.key === "b" || e.key === "B" || e.key === ".") {
        setEscuro((v) => !v);
        return;
      }
      if (escuro) {
        // qualquer clique do passador com a tela escura só acende de volta
        if (AVANCAR.has(e.key) || VOLTAR.has(e.key)) {
          e.preventDefault();
          setEscuro(false);
        }
        return;
      }
      if (AVANCAR.has(e.key)) {
        // Enter/espaço num botão focado é clique no botão, não avanço
        if ((e.key === " " || e.key === "Enter") && alvo?.tagName === "BUTTON") return;
        e.preventDefault();
        setIndice((i) => Math.min(total - 1, i + 1));
      } else if (VOLTAR.has(e.key)) {
        e.preventDefault();
        setIndice((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") {
        setIndice(0);
      } else if (e.key === "End") {
        setIndice(total - 1);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [total, escuro]);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    const mexeu = () => {
      setMouseAtivo(true);
      clearTimeout(temporizador);
      temporizador = setTimeout(() => setMouseAtivo(false), 2500);
    };
    mexeu();
    window.addEventListener("mousemove", mexeu);
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener("mousemove", mexeu);
    };
  }, []);

  const slide = slides[indice];
  if (!slide) return null;

  return (
    <div
      ref={raiz}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-black text-white"
      style={{ cursor: mouseAtivo ? "default" : "none" }}
    >
      <div className="relative flex flex-1 flex-col justify-center overflow-y-auto" style={{ background: slide.fundo }}>
        {/* controles: só aparecem com o mouse em movimento */}
        <div
          className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4 transition-opacity ${
            mouseAtivo ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Link href="/bank" className="rounded-full bg-black/30 px-3 py-1.5 text-sm text-white/80 hover:text-white">
            ✕ Sair
          </Link>
          <div className="flex items-center gap-2 text-sm text-white/80">
            {rodape}
            <button
              type="button"
              onClick={entrarTelaCheia}
              className="rounded-full bg-black/30 px-3 py-1.5 hover:text-white"
            >
              ⛶ Tela cheia
            </button>
          </div>
        </div>

        <div
          key={indice}
          style={{ animation: "fade-slide-in 0.45s ease-out both" }}
          className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-8 py-16 sm:px-16"
        >
          {slide.capa ? (
            <div className="flex flex-col items-start gap-8">
              {slide.conteudo}
              <button
                type="button"
                onClick={() => {
                  entrarTelaCheia();
                  ir(1);
                }}
                className="rounded-full bg-white px-8 py-3 text-lg font-semibold text-slate-900 shadow-lg"
              >
                ▶ Começar
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span className="text-5xl" aria-hidden>
                  {slide.emoji}
                </span>
                <h2 className="text-3xl font-semibold sm:text-5xl">{slide.titulo}</h2>
              </div>
              {slide.conteudo}
            </>
          )}
        </div>

        {/* clique nas bordas também passa (quando não há passador) */}
        <button
          type="button"
          aria-label="Slide anterior"
          onClick={() => ir(indice - 1)}
          className="absolute inset-y-0 left-0 z-10 w-16 cursor-w-resize opacity-0"
          tabIndex={-1}
        />
        <button
          type="button"
          aria-label="Próximo slide"
          onClick={() => ir(indice + 1)}
          className="absolute inset-y-0 right-0 z-10 w-16 cursor-e-resize opacity-0"
          tabIndex={-1}
        />
      </div>

      {/* progresso */}
      <div className="h-1 w-full bg-white/10">
        <div className="h-full bg-white/70 transition-[width] duration-500" style={{ width: `${((indice + 1) / total) * 100}%` }} />
      </div>

      {/* B / ponto: tela escura pra conversar */}
      {escuro && (
        <button
          type="button"
          aria-label="Voltar a mostrar o slide"
          onClick={() => setEscuro(false)}
          className="absolute inset-0 z-50 bg-black"
        />
      )}
    </div>
  );
}
