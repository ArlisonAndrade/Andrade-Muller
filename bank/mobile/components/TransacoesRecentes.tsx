import { View, Text, StyleSheet } from "react-native";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react-native";
import { Card } from "./Card";
import { cores, fontes } from "../lib/tema";
import { moedaBRL, dataBR } from "../lib/formato";
import type { Transacao } from "../lib/tipos";

export function TransacoesRecentes({ transacoes }: { transacoes: Transacao[] }) {
  return (
    <Card title="Transações recentes">
      {transacoes.length === 0 ? (
        <Text style={styles.vazio}>Nenhum lançamento ainda.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {transacoes.map((t) => {
            const despesa = t.categoria?.tipo === "despesa";
            return (
              <View key={t.id} style={styles.linha}>
                {despesa ? (
                  <IconArrowDownRight size={16} strokeWidth={1.5} color={cores.textAlert} />
                ) : (
                  <IconArrowUpRight size={16} strokeWidth={1.5} color={cores.textAccent} />
                )}
                <Text style={styles.descricao} numberOfLines={1}>
                  {t.descricao}
                </Text>
                <Text style={styles.data}>{dataBR(t.data)}</Text>
                <Text style={[styles.valor, { color: despesa ? cores.textAlert : cores.textAccent }]}>
                  {despesa ? "−" : "+"}
                  {moedaBRL(Number(t.valor))}
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
  linha: { flexDirection: "row", alignItems: "center", gap: 8 },
  descricao: { flex: 1, fontFamily: fontes.sans, fontSize: 13, color: cores.textPrimary },
  data: { fontFamily: fontes.sans, fontSize: 11, color: cores.textFaint },
  valor: { fontFamily: fontes.serif, fontSize: 14 },
});
