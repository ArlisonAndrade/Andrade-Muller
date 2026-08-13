"use client";

import { IconX } from "@/components/bank/ui/icones";

// Modal genérico do Bank: folha no mobile (sobe do rodapé), painel centrado
// no desktop. Largura própria (não herda a coluna estreita de onde o botão
// que abriu vive) — é o que evita formulário espremido em card de 2 colunas.
export function Modal({
  titulo,
  subtitulo,
  onFechar,
  children,
  largura = "max-w-md",
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  onFechar: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[85vh] w-full ${largura} overflow-y-auto rounded-t-[16px] bg-surface-1 p-4 sm:rounded-[16px] sm:p-5`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{titulo}</h3>
            {subtitulo && <p className="mt-0.5 text-xs text-text-faint">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2"
          >
            <IconX size={18} stroke={1.8} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
