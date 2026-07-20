// Barra de progresso genérica do Bank. `cor` recebe uma cor CSS (token
// var(--color-...) ou hex) pra manter consistência com o acento do contexto
// (classe de ativo, orçamento, dívida, meta...).
export function ProgressBar({
  percentual,
  cor = "var(--color-bank-primaria)",
  altura = "h-2",
  className = "",
}: {
  percentual: number;
  cor?: string;
  altura?: string;
  className?: string;
}) {
  const largura = Math.max(0, Math.min(100, percentual));
  return (
    <div className={`${altura} overflow-hidden rounded-full bg-surface-3 ${className}`}>
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${largura}%`, background: cor }}
      />
    </div>
  );
}
