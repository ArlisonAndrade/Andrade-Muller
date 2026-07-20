import { Card } from "@/components/bank/ui/card";
import { moedaBRL, dataBR } from "@/lib/bank/formato";
import { IconArrowUpRight, IconArrowDownRight } from "@/components/bank/ui/icones";
import type { Transacao } from "@/lib/bank/tipos";

export function TransacoesRecentes({ transacoes }: { transacoes: Transacao[] }) {
  return (
    <Card title="Transações recentes">
      {transacoes.length === 0 ? (
        <p className="text-sm text-text-faint">Nenhum lançamento ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {transacoes.map((t) => {
            const despesa = t.categoria?.tipo === "despesa";
            return (
              <li key={t.id} className="flex items-center gap-3">
                {despesa ? (
                  <IconArrowDownRight size={16} stroke={1.5} className="shrink-0 text-text-alert" />
                ) : (
                  <IconArrowUpRight size={16} stroke={1.5} className="shrink-0 text-text-accent" />
                )}
                <span className="flex-1 truncate text-sm text-text-primary">{t.descricao}</span>
                <span className="text-xs text-text-faint">{dataBR(t.data)}</span>
                <span
                  className={`text-sm font-medium ${despesa ? "text-text-alert" : "text-text-accent"}`}
                >
                  {despesa ? "−" : "+"}
                  {moedaBRL(Number(t.valor))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
