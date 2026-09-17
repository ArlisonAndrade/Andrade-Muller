"use client";

import { useEffect, useRef } from "react";
import { dispararConfete } from "@/components/bank/conquistas/celebracao";

// Confete quando o slide aparece — usado no encerramento da reunião, pra
// terminar em alta. O slideshow remonta o conteúdo a cada troca, então
// voltar pro slide comemora de novo.
export function ConfeteAoEntrar({ atraso = 400 }: { atraso?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const t = setTimeout(() => canvas.current && dispararConfete(canvas.current), atraso);
    return () => clearTimeout(t);
  }, [atraso]);
  return (
    <canvas ref={canvas} className="pointer-events-none absolute -inset-16 z-20 h-[calc(100%+8rem)] w-[calc(100%+8rem)]" />
  );
}
