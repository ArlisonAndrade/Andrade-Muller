import { Card } from "@/components/bank/ui/card";
import { moedaBRL, dataBR } from "@/lib/bank/formato";
import { IconArrowsExchange } from "@/components/bank/ui/icones";

type Ponte = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
};

export function PonteProLabore({ pontes }: { pontes: Ponte[] }) {
  return (
    <Card title="Ponte pró-labore — CNPJ → Família">
      {pontes.length === 0 ? (
        <p className="text-sm text-text-faint">
          Nenhuma distribuição vinculada lançada ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pontes.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <IconArrowsExchange size={18} className="shrink-0 text-text-accent" stroke={1.5} />
              <span className="flex-1 text-sm text-text-primary">{p.descricao}</span>
              <span className="text-xs text-text-faint">{dataBR(p.data)}</span>
              <span className="text-sm font-medium text-text-accent">
                {moedaBRL(p.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
