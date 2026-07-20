import { Card } from "@/components/bank/ui/card";
import { GaugeScore } from "@/components/bank/ui/gauge-score";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import type { ScoreSaudeFinanceira } from "@/lib/bank/score";

// Card do score de saúde financeira: gauge + breakdown por pilar + a
// dica da maior alavanca ("o que fazer pra subir").
export function ScoreSaude({ score }: { score: ScoreSaudeFinanceira }) {
  return (
    <Card title="Saúde financeira">
      <GaugeScore total={score.total} />
      <div className="mt-4 flex flex-col gap-2.5">
        {score.pilares.map((p) => (
          <div key={p.chave}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-text-secondary">{p.rotulo}</span>
              <span className="font-medium text-text-primary">{p.pontos}/25</span>
            </div>
            <ProgressBar
              percentual={(p.pontos / 25) * 100}
              cor={
                p.pontos >= 19
                  ? "var(--color-bank-positivo)"
                  : p.pontos >= 12
                    ? "#f59e0b"
                    : "var(--color-bank-negativo)"
              }
              altura="h-1.5"
            />
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-[10px] bg-surface-3 px-3 py-2.5 text-xs text-text-secondary">
        <span className="font-semibold text-text-primary">Pra subir: </span>
        {score.maiorAlavanca.dica}
      </p>
    </Card>
  );
}
