import { Card } from "@/components/bank/ui/card";
import { moedaBRL } from "@/lib/bank/formato";

const GRUPOS = [
  { chave: "essencial_50", rotulo: "Essencial (50%)", alvo: 0.5 },
  { chave: "liberdade_30", rotulo: "Liberdade (30%)", alvo: 0.3 },
  { chave: "investimento_20", rotulo: "Investimento (20%)", alvo: 0.2 },
] as const;

export function Orcamento503020({
  totalReceita,
  gastoPorGrupo,
}: {
  totalReceita: number;
  gastoPorGrupo: Record<string, number>;
}) {
  return (
    <Card title="Orçamento 50/30/20 — Família">
      <div className="flex flex-col gap-5">
        {GRUPOS.map((grupo) => {
          const gasto = gastoPorGrupo[grupo.chave] ?? 0;
          const alvoValor = totalReceita * grupo.alvo;
          const pct = alvoValor > 0 ? Math.round((gasto / alvoValor) * 100) : 0;
          const estourou = pct > 100;
          return (
            <div key={grupo.chave}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <p className="text-sm text-text-primary">{grupo.rotulo}</p>
                <span className="text-xs text-text-faint">
                  {moedaBRL(gasto)} de {moedaBRL(alvoValor)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={`h-full rounded-full ${estourou ? "bg-text-alert" : "bg-text-accent"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
        {totalReceita === 0 && (
          <p className="text-xs text-text-faint">
            Sem receita lançada este período — os alvos aparecem quando houver lançamentos.
          </p>
        )}
      </div>
    </Card>
  );
}
