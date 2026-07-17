import { View, Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { cores, fontes } from "../lib/tema";
import { moedaBRL } from "../lib/formato";
import type { PosicaoAtivo } from "../lib/tipos";

export function InvestimentosB3({
  posicoes,
  cotacoes,
}: {
  posicoes: PosicaoAtivo[];
  cotacoes: Map<string, number>;
}) {
  const ativas = posicoes.filter((p) => Number(p.quantidade_atual) > 0);

  return (
    <Card title="Investimentos B3">
      {ativas.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma posição em carteira.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {ativas.map((p) => {
            const preco = cotacoes.get(p.ativo_id) ?? Number(p.preco_medio) ?? 0;
            const posicaoAtual = Number(p.quantidade_atual) * preco;
            return (
              <View key={p.ativo_id} style={styles.linha}>
                <Text style={styles.ticker}>{p.ticker}</Text>
                <Text style={styles.posicao}>{moedaBRL(posicaoAtual)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  vazio: { fontFamily: fontes.sans, fontSize: 13, color: cores.textFaint },
  linha: { flexDirection: "row", justifyContent: "space-between" },
  ticker: { fontFamily: fontes.sans, fontSize: 13, color: cores.textSecondary },
  posicao: { fontFamily: fontes.serif, fontSize: 14, color: cores.textPrimary },
});
