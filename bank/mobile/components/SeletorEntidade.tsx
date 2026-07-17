import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { cores, fontes } from "../lib/tema";
import type { VisaoEntidade } from "../lib/tipos";

const OPCOES: { valor: VisaoEntidade; rotulo: string }[] = [
  { valor: "consolidado", rotulo: "Consolidado" },
  { valor: "familia", rotulo: "Família" },
];

export function SeletorEntidade({
  visaoAtual,
  onMudar,
}: {
  visaoAtual: VisaoEntidade;
  onMudar: (visao: VisaoEntidade) => void;
}) {
  return (
    <View style={styles.container}>
      {OPCOES.map((opcao) => {
        const ativo = opcao.valor === visaoAtual;
        return (
          <TouchableOpacity
            key={opcao.valor}
            onPress={() => onMudar(opcao.valor)}
            style={[styles.opcao, ativo && styles.opcaoAtiva]}
          >
            <Text style={[styles.texto, ativo && styles.textoAtivo]}>{opcao.rotulo}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: cores.border,
    borderRadius: 12,
    padding: 4,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  opcao: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  opcaoAtiva: {
    backgroundColor: cores.textPrimary,
  },
  texto: {
    fontFamily: fontes.sans,
    fontSize: 13,
    color: cores.textSecondary,
  },
  textoAtivo: {
    color: cores.surface2,
    fontFamily: fontes.sansMedium,
  },
});
