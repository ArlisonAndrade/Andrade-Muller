import { moedaBRL } from "@/lib/bank/formato";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import {
  type FaseArthur,
  type StatusFase,
  ROTULO_STATUS_FASE,
  EMOJI_STATUS_FASE,
} from "@/lib/bank/plano-arthur";

const COR_STATUS: Record<StatusFase, string> = {
  nao_iniciada: "var(--color-text-faint)",
  em_andamento: "var(--color-bank-primaria)",
  atrasada: "var(--color-bank-negativo)",
  concluida: "var(--color-bank-positivo)",
};

const BG_STATUS: Record<StatusFase, string> = {
  nao_iniciada: "bg-surface-3 text-text-secondary",
  em_andamento: "bg-bank-primaria-bg text-bank-primaria",
  atrasada: "bg-bank-negativo-bg text-bank-negativo",
  concluida: "bg-bank-positivo-bg text-bank-positivo",
};

// Card de uma fase do plano do Arthur — emoji, aporte, meta, barra de
// progresso real-vs-esperado e o selo de status. É a peça central da
// aba, então a cada fase precisa transmitir "isto está sendo construído".
export function FaseCard({
  fase,
  status,
  patrimonioAtual,
  metaAnterior,
  ativa,
}: {
  fase: FaseArthur;
  status: StatusFase;
  patrimonioAtual: number;
  metaAnterior: number;
  ativa: boolean;
}) {
  const progresso =
    fase.metaFinal > metaAnterior
      ? Math.max(0, Math.min(100, ((patrimonioAtual - metaAnterior) / (fase.metaFinal - metaAnterior)) * 100))
      : 100;
  const temAporte = fase.aporteMensal > 0 || fase.aporteAniversario > 0;

  return (
    <div
      className={`card-bank overflow-hidden p-4 sm:p-5 ${ativa ? "ring-2 ring-bank-primaria" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {fase.emoji}
          </span>
          <div>
            <p className="text-xs text-text-faint">Fase {fase.numero}</p>
            <p className="text-base font-semibold text-text-primary">{fase.nome}</p>
            <p className="text-xs text-text-faint">
              {fase.idadeInicio} a {fase.idadeFim} anos
            </p>
          </div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${BG_STATUS[status]}`}
        >
          {EMOJI_STATUS_FASE[status]} {ROTULO_STATUS_FASE[status]}
        </span>
      </div>

      <p className="mt-3 text-sm text-text-secondary">{fase.descricao}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {temAporte ? (
          <>
            <div>
              <p className="text-xs text-text-faint">Aporte mensal</p>
              <p className="font-semibold numeros-tabulares">{moedaBRL(fase.aporteMensal)}</p>
            </div>
            <div>
              <p className="text-xs text-text-faint">Aporte aniversário</p>
              <p className="font-semibold numeros-tabulares">{moedaBRL(fase.aporteAniversario)}</p>
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <p className="text-xs text-text-faint">
              {fase.numero === 0 ? "Sem ritmo fixo — histórico" : "Sem aporte novo — só rendimento"}
            </p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-xs text-text-faint">Meta ao fim da fase</p>
          <p className="font-semibold numeros-tabulares">{moedaBRL(fase.metaFinal)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-text-faint">
          <span>{moedaBRL(Math.max(0, patrimonioAtual))} hoje</span>
          <span>{progresso.toFixed(0)}%</span>
        </div>
        <ProgressBar percentual={progresso} cor={COR_STATUS[status]} />
      </div>
    </div>
  );
}
