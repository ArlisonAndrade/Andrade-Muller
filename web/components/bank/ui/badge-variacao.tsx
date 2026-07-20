import { IconArrowUpRight, IconArrowDownRight } from "@/components/bank/ui/icones";

// Pill de variação percentual (verde/vermelho) com seta — padrão do visual
// novo pra qualquer métrica com direção (variação do dia, rentabilidade...).
export function BadgeVariacao({
  percentual,
  casas = 2,
  className = "",
}: {
  percentual: number;
  casas?: number;
  className?: string;
}) {
  const positivo = percentual >= 0;
  const Seta = positivo ? IconArrowUpRight : IconArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        positivo
          ? "bg-bank-positivo-bg text-bank-positivo"
          : "bg-bank-negativo-bg text-bank-negativo"
      } ${className}`}
    >
      <Seta size={13} stroke={2.2} />
      {Math.abs(percentual).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      })}
      %
    </span>
  );
}
