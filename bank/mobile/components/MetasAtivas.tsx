import { View, Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { cores, fontes } from "../lib/tema";
import { moedaBRL } from "../lib/formato";
import type { Meta } from "../lib/tipos";

export function MetasAtivas({ metas }: { metas: Meta[] }) {
  return (
    <Card title="Metas ativas">
      {metas.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma meta em andamento.</Text>
      ) : (
        <View style={{ gap: 16 }}>
          {metas.map((m) => {
            const progresso = m.valor_alvo
              ? Math.min(100, Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100))
              : 0;
            return (
              <View key={m.id}>
                <View style={styles.linhaTitulo}>
                  <Text style={styles.titulo}>{m.titulo}</Text>
                  <Text style={styles.progresso}>{progresso}%</Text>
                </View>
                <View style={styles.trilha}>
                  <View style={[styles.barra, { width: `${progresso}%` }]} />
                </View>
                <Text style={styles.legenda}>
                  {moedaBRL(Number(m.valor_atual))} de {moedaBRL(Number(m.valor_alvo))}
                </Text>
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
  linhaTitulo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  titulo: { fontFamily: fontes.sans, fontSize: 13, color: cores.textPrimary },
  progresso: { fontFamily: fontes.serif, fontSize: 13, color: cores.textAccent },
  trilha: { height: 6, borderRadius: 3, backgroundColor: cores.surface1, overflow: "hidden" },
  barra: { height: "100%", backgroundColor: cores.textAccent, borderRadius: 3 },
  legenda: { marginTop: 4, fontFamily: fontes.sans, fontSize: 11, color: cores.textFaint },
});
