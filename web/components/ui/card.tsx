import type { ReactNode } from "react";

// Padrão de card do PRD 5.3: fundo quente, sombra leve, radius 12px, sem borda forte.
export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card bg-card p-6 shadow-card ${className}`}
    >
      {title && (
        <h2 className="mb-4 font-display text-lg font-medium text-ink">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
