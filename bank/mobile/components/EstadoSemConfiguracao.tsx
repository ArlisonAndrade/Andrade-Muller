import { View, Text, StyleSheet } from "react-native";
import { cores, fontes } from "../lib/tema";

export function EstadoSemConfiguracao() {
  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Projeto Supabase do Bank ainda não configurado</Text>
      <Text style={styles.texto}>
        Copie .env.example para .env e preencha com a URL e a chave anônima do MESMO projeto
        Supabase usado pelo bank/web.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderColor: cores.border,
    borderRadius: 12,
    padding: 24,
    margin: 20,
  },
  titulo: {
    fontFamily: fontes.serif,
    fontSize: 18,
    color: cores.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  texto: {
    fontFamily: fontes.sans,
    fontSize: 13,
    color: cores.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
});
