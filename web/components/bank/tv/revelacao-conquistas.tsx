"use client";

import { useEffect, useRef } from "react";
import { Medalha } from "@/components/bank/conquistas/medalha";
import { dispararConfete, ESTILO_ANIMACOES, type ConquistaParaCelebrar } from "@/components/bank/conquistas/celebracao";

// O ponto alto da reunião: as medalhas do trimestre entram uma a uma, girando,
// e o confete dispara quando o slide aparece (o slideshow remonta o conteúdo a
// cada troca, então voltar pro slide comemora de novo — de propósito).
export function RevelacaoConquistas({
  conquistas,
  vazio,
}: {
  conquistas: ConquistaParaCelebrar[];
  vazio: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (conquistas.length === 0 || !canvas.current) return;
    const atraso = setTimeout(() => canvas.current && dispararConfete(canvas.current), conquistas.length * 350);
    return () => clearTimeout(atraso);
  }, [conquistas.length]);

  if (conquistas.length === 0) {
    return <p className="text-lg text-white/80">{vazio}</p>;
  }

  return (
    <div className="relative">
      <style>{ESTILO_ANIMACOES}</style>
      {/* absolute, não fixed: o slide anima com transform, e isso prende o fixed nele de qualquer jeito */}
      <canvas ref={canvas} className="pointer-events-none absolute -inset-16 z-20 h-[calc(100%+8rem)] w-[calc(100%+8rem)]" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {conquistas.map((c, i) => (
          <div
            key={c.codigo}
            className="flex flex-col items-center gap-2 rounded-[16px] bg-white/10 p-4 text-center"
            style={{ animation: "fade-slide-in 0.4s ease-out both", animationDelay: `${i * 350}ms` }}
          >
            <span
              className="anima-medalha"
              style={{ animation: "medalha-entra 1.1s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${i * 350}ms` }}
            >
              <Medalha emoji={c.emoji} nivel={c.nivel} tamanho={84} />
            </span>
            <p className="text-base font-semibold text-white">{c.nome}</p>
            <p className="text-xs text-white/70">{c.frase}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
