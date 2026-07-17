import { View, Text, StyleSheet } from "react-native";
import { cores, fontes } from "../lib/tema";
import { moedaBRL } from "../lib/formato";
import type { PosicaoAtivo } from "../lib/tipos";

export function CarteiraArthur({
  patrimonio,
  posicoes,
}: {
  patrimonio: number;
  posicoes: PosicaoAtivo[];
}) {
  const ativas = posicoes.filter((p) => Number(p.quantidade_atual) > 0);

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Carteira Arthur</Text>
      <Text style={styles.valor}>{moedaBRL(patrimonio)}</Text>
      {ativas.length === 0 ? (
        <Text style={styles.vazio}>Sem posições registradas ainda.</Text>
      ) : (
        <View style={{ marginTop: 12, gap: 6 }}>
          {ativas.map((p) => (
            <View key={p.ativo_id} style={styles.linha}>
              <Text style={styles.ticker}>{p.ticker}</Text>
              <Text style={styles.qtd}>{Number(p.quantidade_atual).toLocaleString("pt-BR")} un.</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderColor: `${cores.arthur}4D`,
    borderRadius: 12,
    backgroundColor: cores.surface2,
    padding: 20,
  },
  titulo: { fontFamily: fontes.sansMedium, fontSize: 13, color: cores.arthur },
  valor: { fontFamily: fontes.serif, fontSize: 26, color: cores.arthur, marginTop: 6 },
  vazio: { marginTop: 12, fontFamily: fontes.sans, fontSize: 12, color: cores.textFaint },
  linha: { flexDirection: "row", justifyContent: "space-between" },
  ticker: { fontFamily: fontes.sans, fontSize: 13, color: cores.textSecondary },
  qtd: { fontFamily: fontes.sans, fontSize: 13, color: cores.textPrimary },
});
