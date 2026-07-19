import { CardMetrico } from "@/components/bank/ui/card";
import { moedaBRL, mesBR } from "@/lib/bank/formato";
import type { FaturaCartao } from "@/lib/bank/tipos";

export function ProximaFatura({ fatura }: { fatura: FaturaCartao | null }) {
  if (!fatura) {
    return (
      <CardMetrico label="Próxima fatura" valor="—">
        <p className="mt-2 text-xs text-text-faint">Nenhuma fatura em aberto.</p>
      </CardMetrico>
    );
  }

  return (
    <CardMetrico
      label={`Próxima fatura · ${fatura.cartao?.nome ?? "Cartão"}`}
      valor={moedaBRL(Number(fatura.valor_total ?? 0))}
      corValor="text-text-alert"
    >
      <p className="mt-2 text-xs text-text-faint">
        Competência de {mesBR(fatura.competencia)}
      </p>
    </CardMetrico>
  );
}
