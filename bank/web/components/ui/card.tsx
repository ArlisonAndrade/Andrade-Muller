import type { ReactNode } from "react";

// Card padrão do Bank: borda fina 0.5px, sem sombra (design_tokens.md).
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
    <section className={`card-borda bg-surface-2 p-6 ${className}`}>
      {title && (
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

// Card métrico destacado: fundo surface-1, sem borda, número grande em serifa.
export function CardMetrico({
  label,
  valor,
  corValor = "text-text-primary",
  className = "",
  children,
}: {
  label: string;
  valor: string;
  corValor?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`rounded-card bg-surface-1 p-6 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
        {label}
      </p>
      <p className={`mt-2 font-serif text-3xl font-medium ${corValor}`}>
        {valor}
      </p>
      {children}
    </section>
  );
}
