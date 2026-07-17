import { CardMetrico } from "./Card";
import { Text } from "react-native";
import { cores, fontes } from "../lib/tema";
import { moedaBRL } from "../lib/formato";

type Fatura = {
  valor_total: number | null;
  competencia: string;
  cartao?: { nome: string } | null;
} | null;

export function ProximaFatura({ fatura }: { fatura: Fatura }) {
  if (!fatura) {
    return (
      <CardMetrico label="Próxima fatura" valor="—">
        <Text style={{ marginTop: 8, fontFamily: fontes.sans, fontSize: 11, color: cores.textFaint }}>
          Nenhuma fatura em aberto.
        </Text>
      </CardMetrico>
    );
  }

  return (
    <CardMetrico
      label={`Próxima fatura · ${fatura.cartao?.nome ?? "Cartão"}`}
      valor={moedaBRL(Number(fatura.valor_total ?? 0))}
      corValor={cores.textAlert}
    />
  );
}
