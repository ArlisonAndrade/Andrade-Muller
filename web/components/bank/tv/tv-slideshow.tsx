"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { IconChevronLeft, IconChevronRight, IconX } from "@/components/bank/ui/icones";

export type SlideTv = {
  titulo: string;
  emoji: string;
  fundo: string;
  conteudo: ReactNode;
};

// Slideshow do Modo TV — avanço só manual (seta do teclado, clique nos
// botões ou nos pontinhos), pensado pra ficar ligado numa TV/monitor sem
// trocar sozinho. Cada slide é montado no server (app/bank/tv/page.tsx) e
// só passa por aqui como conteúdo pronto — este componente só cuida do
// índice atual e da navegação.
export function TvSlideshow({ slides }: { slides: SlideTv[] }) {
  const [indice, setIndice] = useState(0);
  const total = slides.length;

  const anterior = useCallback(() => setIndice((i) => (i - 1 + total) % total), [total]);
  const proximo = useCallback(() => setIndice((i) => (i + 1) % total), [total]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "ArrowRight") proximo();
      if (e.key === "ArrowLeft") anterior();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [anterior, proximo]);

  const slide = slides[indice];
  if (!slide) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/bank"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <IconX size={16} stroke={1.8} /> Sair do Modo TV
        </Link>
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.titulo}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ir pro slide ${s.titulo}`}
              className={`h-1.5 rounded-full transition-all ${
                i === indice ? "w-6 bg-bank-primaria" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        className="relative flex min-h-[65vh] flex-col justify-center overflow-hidden rounded-[20px] p-6 sm:p-10"
        style={{ background: slide.fundo }}
      >
        <button
          type="button"
          onClick={anterior}
          aria-label="Slide anterior"
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white transition-colors hover:bg-black/35"
        >
          <IconChevronLeft size={22} stroke={2} />
        </button>
        <button
          type="button"
          onClick={proximo}
          aria-label="Próximo slide"
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white transition-colors hover:bg-black/35"
        >
          <IconChevronRight size={22} stroke={2} />
        </button>

        <div key={indice} style={{ animation: "fade-slide-in 0.35s ease-out both" }} className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-8 sm:px-12">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden>
              {slide.emoji}
            </span>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">{slide.titulo}</h2>
          </div>
          {slide.conteudo}
        </div>
      </div>

      <p className="text-center text-xs text-text-faint">
        {indice + 1} de {total} · use as setas do teclado ou os botões pra navegar
      </p>
    </div>
  );
}
