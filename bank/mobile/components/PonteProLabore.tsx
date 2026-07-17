import { View, Text, StyleSheet } from "react-native";
import { IconArrowsExchange } from "@tabler/icons-react-native";
import { Card } from "./Card";
import { cores, fontes } from "../lib/tema";
import { moedaBRL, dataBR } from "../lib/formato";

type Ponte = { id: string; descricao: string; valor: number; data: string };

export function PonteProLabore({ pontes }: { pontes: Ponte[] }) {
  return (
    <Card title="Ponte pró-labore — CNPJ → Família">
      {pontes.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma distribuição vinculada lançada ainda.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {pontes.map((p) => (
            <View key={p.id} style={styles.linha}>
              <IconArrowsExchange size={16} strokeWidth={1.5} color={cores.textAccent} />
              <Text style={styles.descricao} numberOfLines={1}>
                {p.descricao}
              </Text>
              <Text style={styles.data}>{dataBR(p.data)}</Text>
              <Text style={styles.valor}>{moedaBRL(p.valor)}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  vazio: { fontFamily: fontes.sans, fontSize: 13, color: cores.textFaint },
  linha: { flexDirection: "row", alignItems: "center", gap: 8 },
  descricao: { flex: 1, fontFamily: fontes.sans, fontSize: 13, color: cores.textPrimary },
  data: { fontFamily: fontes.sans, fontSize: 11, color: cores.textFaint },
  valor: { fontFamily: fontes.serif, fontSize: 13, color: cores.textAccent },
});
