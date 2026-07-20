import type { ReactNode } from "react";

// Card padrão do Bank (visual novo): branco, cantos 12px, sombra suave.
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
    <section className={`card-bank p-5 ${className}`}>
      {title && (
        <h2 className="mb-4 text-sm font-semibold text-text-primary">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

// Card métrico simples (legado — os novos usam CardMetrica de card-metrica.tsx).
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
    <section className={`card-bank p-5 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${corValor}`}>
        {valor}
      </p>
      {children}
    </section>
  );
}
