import type { ReactNode } from "react";
import { BadgeVariacao } from "@/components/bank/ui/badge-variacao";

// Card de métrica do visual novo: label pequeno, valor grande, badge de
// variação opcional e linha de apoio (ex.: "Valor investido R$ 57.028,40").
export function CardMetrica({
  label,
  valor,
  variacaoPct,
  apoio,
  icone,
  corValor = "text-text-primary",
  className = "",
  children,
}: {
  label: string;
  valor: string;
  variacaoPct?: number;
  apoio?: ReactNode;
  icone?: ReactNode;
  corValor?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`card-bank p-4 sm:p-5 ${className}`}>
      <div className="flex items-center gap-2">
        {icone && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-text-secondary">
            {icone}
          </span>
        )}
        <p className="text-xs font-medium text-text-secondary sm:text-sm">{label}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className={`text-xl font-semibold sm:text-2xl ${corValor}`}>{valor}</p>
        {variacaoPct !== undefined && <BadgeVariacao percentual={variacaoPct} />}
      </div>
      {apoio && <div className="mt-1 text-xs text-text-faint sm:text-sm">{apoio}</div>}
      {children}
    </section>
  );
}
