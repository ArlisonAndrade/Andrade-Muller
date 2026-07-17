import { View, Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { cores, fontes } from "../lib/tema";
import { moedaBRL } from "../lib/formato";

const GRUPOS = [
  { chave: "essencial_50", rotulo: "Essencial (50%)", alvo: 0.5 },
  { chave: "liberdade_30", rotulo: "Liberdade (30%)", alvo: 0.3 },
  { chave: "investimento_20", rotulo: "Investimento (20%)", alvo: 0.2 },
] as const;

export function Orcamento503020({
  totalReceita,
  gastoPorGrupo,
}: {
  totalReceita: number;
  gastoPorGrupo: Record<string, number>;
}) {
  return (
    <Card title="Orçamento 50/30/20 — Família">
      <View style={{ gap: 16 }}>
        {GRUPOS.map((grupo) => {
          const gasto = gastoPorGrupo[grupo.chave] ?? 0;
          const alvoValor = totalReceita * grupo.alvo;
          const pct = alvoValor > 0 ? Math.round((gasto / alvoValor) * 100) : 0;
          const estourou = pct > 100;
          return (
            <View key={grupo.chave}>
              <View style={styles.linhaTitulo}>
                <Text style={styles.titulo}>{grupo.rotulo}</Text>
                <Text style={styles.legenda}>
                  {moedaBRL(gasto)} de {moedaBRL(alvoValor)}
                </Text>
              </View>
              <View style={styles.trilha}>
                <View
                  style={[
                    styles.barra,
                    {
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: estourou ? cores.textAlert : cores.textAccent,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
        {totalReceita === 0 && (
          <Text style={styles.vazio}>
            Sem receita lançada este período — os alvos aparecem quando houver lançamentos.
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  linhaTitulo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  titulo: { fontFamily: fontes.sans, fontSize: 13, color: cores.textPrimary },
  legenda: { fontFamily: fontes.sans, fontSize: 11, color: cores.textFaint },
  trilha: { height: 6, borderRadius: 3, backgroundColor: cores.surface1, overflow: "hidden" },
  barra: { height: "100%", borderRadius: 3 },
  vazio: { fontFamily: fontes.sans, fontSize: 12, color: cores.textFaint },
});
