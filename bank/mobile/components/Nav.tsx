import { View, StyleSheet } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { cores } from "../lib/tema";

// Mesma logo do bank/web (bank/logo_andrade_muller_bank.svg), desenhada
// via react-native-svg pra não depender de pipeline de imagem/transformer.
export function Nav() {
  return (
    <View style={styles.container}>
      <Svg width={170} height={53} viewBox="0 0 640 200">
        <Circle cx={46} cy={82} r={26} fill="none" stroke="#2C2C2A" strokeWidth={2} />
        <Circle cx={80} cy={82} r={26} fill="none" stroke="#2C2C2A" strokeWidth={2} />
        <SvgText x={130} y={96} fontFamily="Georgia, serif" fontSize={44} fontWeight={500} fill="#0B0B0B">
          Andrade&Muller
        </SvgText>
        <SvgText x={130} y={130} fontFamily="Helvetica" fontSize={15} letterSpacing={3} fill="#52514E">
          BANK
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
    borderBottomColor: cores.border,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: "flex-start",
  },
});
