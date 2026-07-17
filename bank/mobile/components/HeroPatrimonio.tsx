import { View, Text, StyleSheet } from "react-native";
import { cores, fontes } from "../lib/tema";
import { moedaBRL } from "../lib/formato";
import type { VisaoEntidade } from "../lib/tipos";

const ROTULO: Record<VisaoEntidade, string> = {
  consolidado: "Patrimônio consolidado",
  familia: "Patrimônio da Família",
};

export function HeroPatrimonio({ visao, valor }: { visao: VisaoEntidade; valor: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>{ROTULO[visao]}</Text>
      <Text style={styles.valor}>{moedaBRL(valor)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  rotulo: { fontFamily: fontes.sans, fontSize: 13, color: cores.textSecondary },
  valor: { fontFamily: fontes.serif, fontSize: 38, color: cores.textPrimary, marginTop: 4 },
});
