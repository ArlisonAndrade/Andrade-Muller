import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { cores, fontes } from "../lib/tema";

export function Card({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.titulo}>{title}</Text>}
      {children}
    </View>
  );
}

export function CardMetrico({
  label,
  valor,
  corValor = cores.textPrimary,
  children,
}: {
  label: string;
  valor: string;
  corValor?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.cardMetrico}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.valorMetrico, { color: corValor }]}>{valor}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderColor: cores.border,
    borderRadius: 12,
    backgroundColor: cores.surface2,
    padding: 20,
  },
  titulo: {
    fontFamily: fontes.sansMedium,
    fontSize: 14,
    color: cores.textSecondary,
    marginBottom: 12,
  },
  cardMetrico: {
    borderRadius: 12,
    backgroundColor: cores.surface1,
    padding: 20,
  },
  label: {
    fontFamily: fontes.sansMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: cores.textFaint,
  },
  valorMetrico: {
    fontFamily: fontes.serif,
    fontSize: 26,
    marginTop: 6,
  },
});
