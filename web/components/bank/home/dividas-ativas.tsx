import Link from "next/link";
import { Card } from "@/components/bank/ui/card";
import { moedaBRL, dataBR } from "@/lib/bank/formato";

type Divida = {
  id: string;
  descricao: string;
  valor_total: number;
  valor_pago: number;
  parcelas_total: number | null;
  parcelas_pagas: number | null;
  data_vencimento_proxima: string | null;
};

export function DividasAtivas({ dividas }: { dividas: Divida[] }) {
  return (
    <Card title="Dívidas">
      {dividas.length === 0 ? (
        <p className="text-sm text-text-faint">
          Nenhuma dívida em aberto —{" "}
          <Link href="/bank/dividas/nova" className="text-text-accent underline">
            cadastrar uma
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {dividas.map((d) => {
            const progresso = d.valor_total
              ? Math.min(100, Math.round((Number(d.valor_pago) / Number(d.valor_total)) * 100))
              : 0;
            return (
              <div key={d.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <p className="text-sm text-text-primary">{d.descricao}</p>
                  <span className="text-sm font-medium text-text-alert">
                    {progresso}% pago
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-text-alert"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <p className="text-xs text-text-faint">
                    {moedaBRL(Number(d.valor_pago))} de {moedaBRL(Number(d.valor_total))}
                    {d.parcelas_total ? ` · ${d.parcelas_pagas ?? 0}/${d.parcelas_total} parcelas` : ""}
                    {d.data_vencimento_proxima ? ` · próx. ${dataBR(d.data_vencimento_proxima)}` : ""}
                  </p>
                  <Link href={`/bank/dividas/${d.id}`} className="shrink-0 text-xs text-text-accent underline">
                    Ver plano
                  </Link>
                </div>
              </div>
            );
          })}
          <Link href="/bank/dividas/nova" className="text-xs text-text-accent underline">
            + Nova dívida
          </Link>
        </div>
      )}
    </Card>
  );
}
