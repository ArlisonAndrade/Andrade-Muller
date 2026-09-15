"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { marcarConquistasCelebradas } from "@/lib/bank/acoes/conquistas";
import { Medalha } from "@/components/bank/conquistas/medalha";
import type { Nivel, SeloHistoria, TomComemoracao } from "@/lib/bank/conquistas-visual";

export type ConquistaParaCelebrar = {
  codigo: string;
  emoji: string;
  nivel: Nivel;
  nome: string;
  frase: string;
  selo?: SeloHistoria;
  tom?: TomComemoracao;
};

const CORES = ["#16a34a", "#2563eb", "#f59e0b", "#db2777", "#7c3aed", "#0d9488"];

/** Confete em canvas, sem dependência: ~3 s de papéis caindo com gravidade. */
export function dispararConfete(canvas: HTMLCanvasElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const papeis = Array.from({ length: 160 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: h * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 16 - 6,
    giro: Math.random() * Math.PI,
    vgiro: (Math.random() - 0.5) * 0.3,
    tam: 6 + Math.random() * 6,
    cor: CORES[Math.floor(Math.random() * CORES.length)],
  }));
  const inicio = performance.now();
  let quadro = 0;
  const passo = (t: number) => {
    const decorrido = t - inicio;
    ctx.clearRect(0, 0, w, h);
    for (const p of papeis) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += p.vgiro;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - decorrido / 3200);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
      ctx.restore();
    }
    if (decorrido < 3200) quadro = requestAnimationFrame(passo);
    else ctx.clearRect(0, 0, w, h);
  };
  quadro = requestAnimationFrame(passo);
  return () => cancelAnimationFrame(quadro);
}

export const ESTILO_ANIMACOES = `
@keyframes medalha-entra {
  0% { transform: scale(0.2) rotateY(0deg); opacity: 0; }
  60% { transform: scale(1.15) rotateY(540deg); opacity: 1; }
  100% { transform: scale(1) rotateY(720deg); opacity: 1; }
}
@keyframes selo-surge {
  0% { transform: scale(0.85); opacity: 0; filter: blur(6px); }
  100% { transform: scale(1); opacity: 1; filter: blur(0); }
}
@keyframes brilho-pulsa {
  0%, 100% { opacity: 0.35; transform: scale(0.9); }
  50% { opacity: 0.8; transform: scale(1.1); }
}
@media (prefers-reduced-motion: reduce) {
  .anima-medalha, .anima-brilho { animation: none !important; }
}
`;

// Comemoração de medalha nova: aparece na primeira vez que alguém da família
// abre o site depois da conquista. Uma medalha por vez, com confete; ao fechar,
// todas ficam marcadas como comemoradas.
export function CelebracaoConquistas({ conquistas }: { conquistas: ConquistaParaCelebrar[] }) {
  const [indice, setIndice] = useState(0);
  const [aberta, setAberta] = useState(conquistas.length > 0);
  const [, iniciar] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);

  const atual = conquistas[indice];

  const sobrio = atual?.tom === "sobrio";

  useEffect(() => {
    // Memória não ganha confete: o Fundo do Poço aparece devagar, em silêncio.
    if (!aberta || !canvas.current || sobrio) return;
    return dispararConfete(canvas.current);
  }, [aberta, indice, sobrio]);

  if (!aberta || !atual) return null;

  const fechar = () => {
    setAberta(false);
    iniciar(() => marcarConquistasCelebradas(conquistas.map((c) => c.codigo)));
  };
  const ultima = indice === conquistas.length - 1;
  const historia = !!atual.selo;
  const rotulo = historia
    ? "De onde viemos"
    : conquistas.length > 1
      ? `Conquista ${indice + 1} de ${conquistas.length}`
      : "Conquista desbloqueada";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-colors ${sobrio ? "bg-black/85" : "bg-black/60"}`}
      onClick={fechar}
    >
      <style>{ESTILO_ANIMACOES}</style>
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div
        key={atual.codigo}
        className={`relative w-full max-w-sm rounded-[20px] p-6 text-center shadow-2xl ${sobrio ? "bg-zinc-950 ring-1 ring-zinc-800" : "bg-surface-1"}`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: `fade-slide-in ${sobrio ? "0.9s" : "0.35s"} ease-out both` }}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${
            sobrio ? "text-zinc-400" : historia ? "text-bank-positivo" : "text-bank-primaria"
          }`}
        >
          {rotulo}
        </p>
        <div className="relative mx-auto my-6 flex h-32 w-32 items-center justify-center" style={{ perspective: 600 }}>
          {!sobrio && (
            <span
              className="anima-brilho absolute inset-0 rounded-full"
              style={{
                background: historia
                  ? "radial-gradient(circle, rgba(74,222,128,0.55), transparent 70%)"
                  : "radial-gradient(circle, rgba(250,204,21,0.6), transparent 70%)",
                animation: "brilho-pulsa 2s ease-in-out infinite",
              }}
            />
          )}
          <span
            className="anima-medalha"
            style={{
              animation: sobrio ? "selo-surge 2.2s ease-out both" : "medalha-entra 1.1s cubic-bezier(.2,.8,.2,1) both",
            }}
          >
            <Medalha emoji={atual.emoji} nivel={atual.nivel} selo={atual.selo} tamanho={112} />
          </span>
        </div>
        <p className={`text-xl font-semibold ${sobrio ? "text-zinc-100" : "text-text-primary"}`}>{atual.nome}</p>
        <p className={`mt-2 text-sm ${sobrio ? "text-zinc-400" : "text-text-secondary"}`}>{atual.frase}</p>
        <button
          type="button"
          onClick={ultima ? fechar : () => setIndice((i) => i + 1)}
          className={`mt-6 w-full rounded-[10px] px-4 py-2.5 text-sm font-medium ${
            sobrio ? "bg-zinc-100 text-zinc-900" : "bg-bank-primaria text-white"
          }`}
        >
          {ultima ? "Guardar na coleção" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
