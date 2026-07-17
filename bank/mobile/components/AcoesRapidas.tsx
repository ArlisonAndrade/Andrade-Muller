import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { IconPlus, IconArrowsExchange, IconUpload } from "@tabler/icons-react-native";
import { cores, fontes } from "../lib/tema";

const ACOES = [
  { rotulo: "Lançamento", Icone: IconPlus, msg: "Tela de lançamento chega numa próxima etapa do mobile — use o app web por enquanto." },
  { rotulo: "Transferir pró-labore", Icone: IconArrowsExchange, msg: "Tela de transferência chega numa próxima etapa do mobile — use o app web por enquanto." },
  { rotulo: "Importar fatura", Icone: IconUpload, msg: "Importação de OFX/CSV fica para uma próxima etapa do projeto." },
];

export function AcoesRapidas() {
  return (
    <View style={styles.linha}>
      {ACOES.map(({ rotulo, Icone, msg }) => (
        <TouchableOpacity
          key={rotulo}
          style={styles.acao}
          onPress={() => Alert.alert(rotulo, msg)}
        >
          <Icone size={20} strokeWidth={1.5} color={cores.textPrimary} />
          <Text style={styles.rotulo}>{rotulo}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", gap: 10, marginBottom: 24 },
  acao: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: cores.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
  },
  rotulo: {
    fontFamily: fontes.sansMedium,
    fontSize: 12,
    color: cores.textPrimary,
    textAlign: "center",
  },
});
