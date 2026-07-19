import Link from "next/link";
import { Card } from "@/components/bank/ui/card";
import { moedaBRL } from "@/lib/bank/formato";
import type { Meta } from "@/lib/bank/tipos";

export function MetasAtivas({ metas }: { metas: Meta[] }) {
  return (
    <Card title="Metas ativas">
      {metas.length === 0 ? (
        <p className="text-sm text-text-faint">
          Nenhuma meta em andamento —{" "}
          <Link href="/bank/metas/nova" className="text-text-accent underline">
            criar a primeira
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {metas.map((m) => {
            const progresso = m.valor_alvo
              ? Math.min(100, Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100))
              : 0;
            return (
              <div key={m.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <p className="text-sm text-text-primary">{m.titulo}</p>
                  <span className="font-serif text-sm font-medium text-text-accent">
                    {progresso}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-1">
                  <div
                    className="h-full rounded-full bg-text-accent"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-text-faint">
                  {moedaBRL(Number(m.valor_atual))} de {moedaBRL(Number(m.valor_alvo))}
                </p>
              </div>
            );
          })}
          <Link href="/bank/metas/nova" className="text-xs text-text-accent underline">
            + Nova meta
          </Link>
        </div>
      )}
    </Card>
  );
}
