import { Card } from "@/components/bank/ui/card";
import { moedaBRL, dataBR } from "@/lib/bank/formato";
import { IconCalendarEvent } from "@/components/bank/ui/icones";

export type ContaProxima = {
  rotulo: string;
  detalhe: string; // "dia 10 · Assinaturas", "fatura Nubank", "parcela 12/65"
  valor: number | null;
  data: string; // ISO — usado pra ordenar
};

// "O que vem por aí": recorrências a vencer, fatura aberta e próxima
// parcela de dívida, ordenadas por data.
export function ProximasContas({ contas }: { contas: ContaProxima[] }) {
  const ordenadas = [...contas].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6);

  return (
    <Card title="Próximas contas">
      {ordenadas.length === 0 ? (
        <p className="text-sm text-text-faint">
          Nada programado — cadastre assinaturas no Extrato pra ver os próximos
          vencimentos aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {ordenadas.map((c, i) => (
            <div key={`${c.rotulo}-${i}`} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-text-secondary">
                  <IconCalendarEvent size={16} stroke={1.7} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{c.rotulo}</p>
                  <p className="truncate text-xs text-text-faint">
                    {dataBR(c.data)} · {c.detalhe}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-medium text-text-primary">
                {c.valor != null ? moedaBRL(c.valor) : "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
