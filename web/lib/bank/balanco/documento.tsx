import { readFileSync } from "node:fs";
import path from "node:path";
import { Circle, Document, Font, Image, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { DadosBalanco, LinhaBalanco } from "@/lib/bank/balanco/dados";

// O Balanço Patrimonial Trimestral em PDF. Visual aprovado pelo Arlison no
// rascunho do 3T26 (25/out/2026): papel creme, marinho e ouro, Cormorant para
// títulos, Cinzel para a heráldica, Inter para os números, assinatura em
// Pinyon Script. As fontes e o brasão ficam em arquivo ao lado (não dependem
// de rede na hora de gerar).

const PASTA = path.join(process.cwd(), "lib", "bank", "balanco");
const fonte = (arquivo: string) => path.join(PASTA, "fontes", arquivo);

Font.register({
  family: "Inter",
  fonts: [
    { src: fonte("inter-latin-400-normal.woff"), fontWeight: 400 },
    { src: fonte("inter-latin-500-normal.woff"), fontWeight: 500 },
    { src: fonte("inter-latin-600-normal.woff"), fontWeight: 600 },
    { src: fonte("inter-latin-700-normal.woff"), fontWeight: 700 },
  ],
});
Font.register({
  family: "Cormorant",
  fonts: [
    { src: fonte("cormorant-garamond-latin-600-normal.woff"), fontWeight: 600 },
    { src: fonte("cormorant-garamond-latin-700-normal.woff"), fontWeight: 700 },
    { src: fonte("cormorant-garamond-latin-500-italic.woff"), fontWeight: 500, fontStyle: "italic" },
  ],
});
Font.register({
  family: "Cinzel",
  fonts: [
    { src: fonte("cinzel-latin-500-normal.woff"), fontWeight: 500 },
    { src: fonte("cinzel-latin-600-normal.woff"), fontWeight: 600 },
  ],
});
Font.register({ family: "Pinyon", src: fonte("pinyon-script-latin-400-normal.woff") });
// Palavra longa não é quebrada com hífen no meio.
Font.registerHyphenationCallback((palavra) => [palavra]);

// Lido como bytes: um caminho "C:\..." o react-pdf tenta abrir como URL.
const BRASAO = { data: readFileSync(path.join(PASTA, "brasao.png")), format: "png" as const };

/** As fontes do PDF são o recorte latino: sem a seta →, que vira ›. */
const limpo = (texto: string) => texto.replace(/\s*→\s*/g, " › ");

const COR = {
  tinta: "#1c2733",
  marinho: "#1f3347",
  ouro: "#b8925a",
  ouroClaro: "#efe4d2",
  papel: "#fbf8f2",
  linha: "#ddd3c2",
  suave: "#6b6457",
  positivo: "#3f6b47",
  negativo: "#9a3b3b",
  verde: "#4c6b50",
  terracota: "#8c4a5e",
};

const s = StyleSheet.create({
  pagina: { backgroundColor: COR.papel, paddingTop: 48, paddingHorizontal: 51, paddingBottom: 56, fontFamily: "Inter", fontSize: 9.5, color: COR.tinta, lineHeight: 1.45 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.8, borderBottomColor: COR.ouro, paddingBottom: 8, marginBottom: 22 },
  topoEsq: { flexDirection: "row", alignItems: "center" },
  topoTexto: { fontFamily: "Cinzel", fontWeight: 500, fontSize: 7.5, letterSpacing: 1.1, color: COR.marinho },
  rodape: { position: "absolute", left: 51, right: 51, bottom: 26, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: COR.linha, paddingTop: 5, fontSize: 7, color: COR.suave },
  h1: { fontFamily: "Cormorant", fontWeight: 700, fontSize: 21, lineHeight: 1.25, color: COR.marinho, marginBottom: 2, fontFeatureSettings: ["lnum"] },
  h2: { fontFamily: "Cormorant", fontWeight: 700, fontSize: 14, lineHeight: 1.25, color: COR.marinho, marginBottom: 7, fontFeatureSettings: ["lnum"] },
  sub: { color: COR.suave, marginBottom: 16 },
  // tabela do balanço
  linhaTab: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: COR.linha, paddingVertical: 6, paddingHorizontal: 6 },
  celConta: { flex: 1 },
  celValor: { width: 78, textAlign: "right", fontFeatureSettings: ["tnum"] },
  cabecalho: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COR.marinho, paddingVertical: 5, paddingHorizontal: 6 },
  cabTexto: { fontSize: 7.2, fontWeight: 600, color: COR.suave, letterSpacing: 0.5 },
  grupo: { backgroundColor: COR.ouroClaro, paddingVertical: 6, paddingHorizontal: 6, fontFamily: "Cinzel", fontWeight: 500, fontSize: 8.5, letterSpacing: 1.2, color: COR.marinho },
  total: { fontWeight: 600 },
  pl: { flexDirection: "row", backgroundColor: COR.marinho, paddingVertical: 9, paddingHorizontal: 6, color: "#ffffff", fontWeight: 700, fontSize: 10.5 },
  destaque: { marginTop: 18, borderLeftWidth: 2.5, borderLeftColor: COR.ouro, backgroundColor: "#ffffff", paddingVertical: 10, paddingHorizontal: 13 },
  notas: { marginTop: 12, fontSize: 7.2, color: COR.suave },
  // cartões
  grade: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cartao: { width: "48.6%", backgroundColor: "#ffffff", borderWidth: 0.5, borderColor: COR.linha, borderRadius: 5, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 9 },
  cartaoRot: { fontSize: 7, letterSpacing: 0.7, color: COR.suave },
  cartaoVal: { fontFamily: "Cormorant", fontWeight: 700, fontSize: 18, lineHeight: 1.25, color: COR.marinho, marginVertical: 2, fontFeatureSettings: ["lnum"] },
  cartaoDet: { fontSize: 7.8 },
  caixa: { backgroundColor: "#ffffff", borderWidth: 0.5, borderColor: COR.linha, borderRadius: 5, padding: 11 },
  // listas
  item: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: COR.linha, paddingVertical: 7 },
  marca: { width: 13, height: 13, borderRadius: 7, marginRight: 9, marginTop: 1, alignItems: "center", justifyContent: "center" },
  marcaTexto: { color: "#ffffff", fontSize: 8, fontWeight: 700, lineHeight: 1 },
  passo: { color: COR.suave, fontSize: 8, marginTop: 2 },
  // parecer
  parecer: { fontFamily: "Cormorant", fontWeight: 600, fontSize: 12.2, lineHeight: 1.42, textAlign: "justify", marginBottom: 8, fontFeatureSettings: ["lnum"] },
});

const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace("-", "−");
const brl0 = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
const sinal = (v: number) => (Math.abs(v) < 0.005 ? "—" : `${v > 0 ? "+" : "−"}${brl(Math.abs(v))}`);
const SOBRESCRITO = ["", "¹", "²", "³"];

function Topo({ sigla }: { sigla: string }) {
  return (
    <View style={s.topo} fixed>
      <View style={s.topoEsq}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={BRASAO} style={{ height: 22, marginRight: 8 }} />
        <Text style={s.topoTexto}>CASA ANDRADE MULLER</Text>
      </View>
      <Text style={s.topoTexto}>BALANÇO PATRIMONIAL · {sigla}</Text>
    </View>
  );
}

function Rodape({ sigla }: { sigla: string }) {
  return (
    <View style={s.rodape} fixed>
      <Text>Casa Andrade Muller · Balanço Patrimonial {sigla}</Text>
      <Text render={({ pageNumber }) => String(pageNumber)} />
    </View>
  );
}

function Linha({ l, corVariacao }: { l: LinhaBalanco; corVariacao: (v: number) => string }) {
  const v = l.fim - l.inicio;
  return (
    <View style={s.linhaTab}>
      <Text style={s.celConta}>
        {l.conta}
        {l.nota ? SOBRESCRITO[l.nota] : ""}
      </Text>
      <Text style={s.celValor}>{brl(l.inicio)}</Text>
      <Text style={s.celValor}>{brl(l.fim)}</Text>
      <Text style={[s.celValor, { color: corVariacao(v) }]}>{sinal(v)}</Text>
    </View>
  );
}

function Grafico({ semanas }: { semanas: DadosBalanco["semanas"] }) {
  const lista = semanas.lista;
  if (lista.length === 0) return null;
  const L = 470;
  const A = 150;
  const base = 120;
  const max = Math.max(...lista.map((x) => Math.max(x.gasto, x.meta))) * 1.08;
  const passo = (L - 20) / lista.length;
  const larg = Math.min(30, passo * 0.62);
  const y = (v: number) => base - (v / max) * 108;
  // linha da meta em degraus (a meta muda de uma semana pra outra)
  let caminho = "";
  lista.forEach((x, i) => {
    const x0 = 10 + i * passo;
    caminho += `${i === 0 ? "M" : "L"}${x0} ${y(x.meta)} L${x0 + passo} ${y(x.meta)} `;
  });
  return (
    <Svg width={L} height={A} viewBox={`0 0 ${L} ${A}`}>
      <Rect x={10} y={base} width={L - 20} height={0.6} fill={COR.linha} />
      {lista.map((x, i) => {
        const cx = 10 + i * passo + passo / 2;
        return (
          <Rect key={i} x={cx - larg / 2} y={y(x.gasto)} width={larg} height={base - y(x.gasto)} fill={x.gasto <= x.meta ? COR.verde : COR.terracota} rx={1.5} />
        );
      })}
      <Path d={caminho} stroke={COR.ouro} strokeWidth={1.2} strokeDasharray="4 2.5" fill="none" />
    </Svg>
  );
}

export function DocumentoBalanco({ d }: { d: DadosBalanco }) {
  const corPassivo = (v: number) => (v <= 0 ? COR.positivo : COR.negativo);
  const corAtivo = (v: number) => (v >= 0 ? COR.positivo : COR.negativo);
  const n = d.numeros;
  const totalComposicao = d.composicao.reduce((x, c) => x + c.valor, 0);
  const variacaoPl = d.pl.fim - d.pl.inicio;

  return (
    <Document title={`Balanço Patrimonial ${d.sigla} — Casa Andrade Muller`} author="Arkad" language="pt-BR">
      {/* CAPA */}
      <Page size="A4" style={[s.pagina, { alignItems: "center", paddingTop: 72 }]}>
        <View style={{ position: "absolute", top: 28, left: 28, right: 28, bottom: 28, borderWidth: 1, borderColor: COR.ouro }} fixed />
        <View style={{ position: "absolute", top: 35, left: 35, right: 35, bottom: 35, borderWidth: 0.4, borderColor: COR.ouro }} fixed />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={BRASAO} style={{ width: 190, marginBottom: 28 }} />
        <Text style={{ fontFamily: "Cinzel", fontWeight: 500, fontSize: 12.5, lineHeight: 1.3, letterSpacing: 4, color: COR.marinho }}>CASA ANDRADE MULLER</Text>
        <Text style={{ fontFamily: "Cormorant", fontWeight: 600, fontSize: 29, lineHeight: 1.25, marginTop: 12 }}>Balanço Patrimonial Trimestral</Text>
        <Text style={{ fontFamily: "Cinzel", fontWeight: 500, fontSize: 38, lineHeight: 1.2, color: COR.ouro, letterSpacing: 3, marginVertical: 6 }}>{d.sigla}</Text>
        <Text style={{ fontSize: 10.5, color: COR.suave }}>{d.periodo}</Text>
        <Text style={{ fontFamily: "Cormorant", fontWeight: 500, fontStyle: "italic", fontSize: 12, lineHeight: 1.3, color: COR.marinho, marginTop: 22 }}>
          In unitate robor, in sapientia ductus
        </Text>
        <Text style={{ position: "absolute", bottom: 66, left: 0, right: 0, textAlign: "center", fontSize: 8.5, color: COR.suave }}>
          Emitido em {d.emitidoPorExtenso} pelo conselheiro Arkad
        </Text>
      </Page>

      {/* 1. BALANÇO */}
      <Page size="A4" style={s.pagina}>
        <Topo sigla={d.sigla} />
        <Text style={s.h1}>1. Balanço patrimonial</Text>
        <Text style={s.sub}>
          Posição no fim do trimestre anterior ({d.dataInicio}) e no fim do {d.sigla} ({d.dataFim}), em reais.
        </Text>

        <View style={s.cabecalho}>
          <Text style={[s.celConta, s.cabTexto]}>CONTA</Text>
          <Text style={[s.celValor, s.cabTexto]}>{d.dataInicio}</Text>
          <Text style={[s.celValor, s.cabTexto]}>{d.dataFim}</Text>
          <Text style={[s.celValor, s.cabTexto]}>VARIAÇÃO</Text>
        </View>
        <Text style={s.grupo}>ATIVO</Text>
        {d.ativo.map((l) => (
          <Linha key={l.conta} l={l} corVariacao={corAtivo} />
        ))}
        <View style={[s.linhaTab, { borderBottomWidth: 1, borderBottomColor: COR.marinho }]}>
          <Text style={[s.celConta, s.total]}>Total do ativo</Text>
          <Text style={[s.celValor, s.total]}>{brl(d.totalAtivo.inicio)}</Text>
          <Text style={[s.celValor, s.total]}>{brl(d.totalAtivo.fim)}</Text>
          <Text style={[s.celValor, s.total, { color: corAtivo(d.totalAtivo.fim - d.totalAtivo.inicio) }]}>{sinal(d.totalAtivo.fim - d.totalAtivo.inicio)}</Text>
        </View>
        {d.passivo.length > 0 && (
          <>
            <Text style={s.grupo}>PASSIVO</Text>
            {d.passivo.map((l) => (
              <Linha key={l.conta} l={l} corVariacao={corPassivo} />
            ))}
            <View style={[s.linhaTab, { borderBottomWidth: 1, borderBottomColor: COR.marinho }]}>
              <Text style={[s.celConta, s.total]}>Total do passivo</Text>
              <Text style={[s.celValor, s.total]}>{brl(d.totalPassivo.inicio)}</Text>
              <Text style={[s.celValor, s.total]}>{brl(d.totalPassivo.fim)}</Text>
              <Text style={[s.celValor, s.total, { color: corPassivo(d.totalPassivo.fim - d.totalPassivo.inicio) }]}>{sinal(d.totalPassivo.fim - d.totalPassivo.inicio)}</Text>
            </View>
          </>
        )}
        <View style={s.pl}>
          <Text style={s.celConta}>PATRIMÔNIO LÍQUIDO</Text>
          <Text style={s.celValor}>{brl(d.pl.inicio)}</Text>
          <Text style={s.celValor}>{brl(d.pl.fim)}</Text>
          <Text style={[s.celValor, { color: variacaoPl >= 0 ? "#b9e0bf" : "#f3b8b8" }]}>{sinal(variacaoPl)}</Text>
        </View>

        <View style={s.destaque}>
          <Text>
            <Text style={{ fontWeight: 600, color: COR.marinho }}>
              O patrimônio líquido {variacaoPl >= 0 ? "melhorou" : "recuou"} R$ {brl(Math.abs(variacaoPl))} em três meses
            </Text>
            {variacaoPl >= 0
              ? `, perto de ${brl0(variacaoPl / 3)} por mês: ${brl0(d.totalAtivo.fim - d.totalAtivo.inicio)} vieram do ativo e ${brl0(d.totalPassivo.inicio - d.totalPassivo.fim)} da dívida que diminuiu.`
              : "."}
            {d.pl.fim < 0
              ? d.mesesAteZero != null
                ? ` Ele ainda é negativo. Mantido o ritmo deste trimestre, cruza o zero em cerca de ${d.mesesAteZero} meses.`
                : " Ele ainda é negativo."
              : " A casa já tem mais do que deve."}
          </Text>
        </View>

        {totalComposicao > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text style={s.h2}>Composição do ativo em {d.dataFim}</Text>
            <View style={{ flexDirection: "row", height: 18, borderRadius: 4, overflow: "hidden" }}>
              {d.composicao.map((c) => (
                <View key={c.rotulo} style={{ width: `${(c.valor / totalComposicao) * 100}%`, backgroundColor: c.cor }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              {d.composicao.map((c) => (
                <View key={c.rotulo} style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: c.cor, marginRight: 4 }} />
                  <Text style={{ fontSize: 7.5, color: COR.suave }}>
                    {c.rotulo} {((c.valor / totalComposicao) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.notas}>
          {d.notas.map((nota, i) => (
            <Text key={i} style={{ marginBottom: 3 }}>
              {nota.n ? `${SOBRESCRITO[nota.n]} ` : ""}
              {nota.texto}
            </Text>
          ))}
        </View>
        <Rodape sigla={d.sigla} />
      </Page>

      {/* 2. O TRIMESTRE EM NÚMEROS */}
      <Page size="A4" style={s.pagina}>
        <Topo sigla={d.sigla} />
        <Text style={s.h1}>2. O trimestre em números</Text>
        <Text style={s.sub}>{d.periodo}.</Text>

        <View style={s.grade}>
          {n.cresceuSemRetiradas != null && (
            <Cartao
              rotulo="CRESCIMENTO DA CARTEIRA"
              valor={`${n.cresceuSemRetiradas >= 0 ? "+" : "−"}${brl0(Math.abs(n.cresceuSemRetiradas))}`}
              extra={n.cresceuSemRetiradasPct != null ? ` (${n.cresceuSemRetiradasPct >= 0 ? "+" : ""}${pct(n.cresceuSemRetiradasPct)})` : ""}
              det={
                n.retiradas > 0 && n.carteiraCresceu != null
                  ? `Somando de volta os R$ ${brl(n.retiradas)} retirados da reserva. Sem somar, a carteira cresceu ${brl0(n.carteiraCresceu)}${n.carteiraCresceuPct != null ? ` (${pct(n.carteiraCresceuPct)})` : ""}.`
                  : "Variação da carteira a mercado no trimestre."
              }
            />
          )}
          {n.rentab12M != null && (
            <Cartao
              rotulo="RENTABILIDADE EM 12 MESES"
              valor={pct(n.rentab12M)}
              det={`Pelo método do Investidor10 (por cotas), apurada em ${n.rentabApuradaEm}.${n.rentabTotal != null ? ` Desde o início da carteira: ${pct(n.rentabTotal)}.` : ""}`}
            />
          )}
          <Cartao
            rotulo="APORTES"
            valor={brl0(n.aportado)}
            det={`${n.aportes.map((a) => `${a.rotulo[0].toUpperCase()}${a.rotulo.slice(1)} ${a.valor != null ? brl0(a.valor) : "—"}`).join(" · ")}. ${
              n.reorganizacao ? "Trimestre de reorganização, fora do placar do plano." : `Plano do trimestre: ${brl0(n.planejado)}.`
            }`}
          />
          {d.passivo.length > 0 && (
            <Cartao
              rotulo="SANTANDER"
              valor={`${n.parcelasPagas} ${n.parcelasPagas === 1 ? "parcela paga" : "parcelas pagas"}`}
              det={`R$ ${brl(n.pagoDivida)} pagos, R$ ${brl(n.amortizado)} de principal amortizado. Faltam ${n.parcelasRestantes} parcelas${n.quitacao ? `, com quitação em ${n.quitacao.slice(5, 7)}/${n.quitacao.slice(0, 4)}` : ""}.`}
            />
          )}
          <Cartao
            rotulo="RESERVA DE EMERGÊNCIA"
            valor={brl0(n.reserva)}
            extra={n.metaReserva > 0 ? ` · ${pct((n.reserva / n.metaReserva) * 100)}` : ""}
            det={`${n.metaReserva > 0 ? `Meta de ${brl0(n.metaReserva)}. ` : ""}Renda fixa e espécie, a mercado, em ${d.emitidoEm}.`}
          />
          <Cartao rotulo="CARTEIRA DO ARTHUR" valor={brl0(n.arthur)} det={`Valor em ${d.emitidoEm}.`} />
          <Cartao
            rotulo={`SOBRA LIVRE NO MÊS (${n.mesSobra.toUpperCase()})`}
            valor={brl0(n.sobraTotal)}
            det={`${n.sobra.map((p) => `${p.nome} ${brl0(p.valor)}`).join(" · ")}. Renda menos o que cada um paga direto e transfere.`}
          />
        </View>

        {d.semanas.lista.length > 0 && (
          <View style={[s.caixa, { marginTop: 4 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontWeight: 600, color: COR.marinho, fontSize: 9.5 }}>
                As semanas: média de {d.semanas.media != null ? brl0(d.semanas.media) : "—"}
                {d.semanas.meta != null ? ` contra a meta de ${brl0(d.semanas.meta)}` : ""}
              </Text>
              <Text style={{ fontSize: 7.5, color: COR.suave }}>
                {d.semanas.dentro} de {d.semanas.total} semanas dentro da meta
              </Text>
            </View>
            <Grafico semanas={d.semanas} />
            <View style={{ flexDirection: "row", paddingHorizontal: 10 }}>
              {d.semanas.lista.map((x) => (
                <View key={x.rotulo} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 7.5, fontWeight: 600 }}>{Math.round(x.gasto).toLocaleString("pt-BR")}</Text>
                  <Text style={{ fontSize: 6.8, color: COR.suave }}>{x.rotulo}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 6.8, color: COR.suave, marginTop: 5 }}>
              Semana pelo dia em que começa. Verde: dentro da meta; vinho: acima. Linha tracejada: a meta de cada semana.
            </Text>
          </View>
        )}
        <Rodape sigla={d.sigla} />
      </Page>

      {/* 3 e 4. O QUE DEU CERTO / O QUE AJUSTAR */}
      <Page size="A4" style={s.pagina}>
        <Topo sigla={d.sigla} />
        <Text style={s.h1}>3. O que deu certo</Text>
        <Text style={s.sub}>O que sustenta o plano e precisa continuar.</Text>
        <View style={{ marginBottom: 20 }}>
          {d.certos.map((i, k) => (
            <View key={k} style={s.item} wrap={false}>
              <View style={[s.marca, { backgroundColor: COR.positivo }]}>
                <Visto />
              </View>
              <Text style={{ flex: 1 }}>{limpo(i.texto)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h1}>4. O que ajustar</Text>
        <Text style={s.sub}>Cada ponto vem com o próximo passo.</Text>
        {d.ajustes.length === 0 ? (
          <View style={s.caixa}>
            <Text>Nada a ajustar neste trimestre. O próximo passo é manter o ritmo.</Text>
          </View>
        ) : (
          d.ajustes.map((i, k) => (
            <View key={k} style={s.item} wrap={false}>
              <View style={[s.marca, { backgroundColor: COR.ouro }]}>
                <Text style={s.marcaTexto}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>{limpo(i.texto)}</Text>
                {i.proximoPasso && (
                  <Text style={s.passo}>
                    <Text style={{ fontWeight: 600, color: COR.marinho }}>Próximo passo: </Text>
                    {limpo(i.proximoPasso)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
        <Rodape sigla={d.sigla} />
      </Page>

      {/* 5 e 6. DECISÕES E PRÓXIMO TRIMESTRE */}
      <Page size="A4" style={s.pagina}>
        <Topo sigla={d.sigla} />
        <Text style={s.h1}>5. Decisões do trimestre</Text>
        {d.reuniao.realizada ? (
          <>
            <Text style={s.sub}>Compromissos firmados pela família na reunião do {d.sigla}.</Text>
            {d.reuniao.compromissos.map((c, k) => (
              <View key={k} style={s.item} wrap={false}>
                <View style={[s.marca, { backgroundColor: COR.marinho }]}>
                  <Text style={s.marcaTexto}>{k + 1}</Text>
                </View>
                <Text style={{ flex: 1 }}>{limpo(c.texto)}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={{ alignSelf: "flex-start", borderWidth: 1.8, borderColor: COR.negativo, paddingVertical: 6, paddingHorizontal: 14, marginTop: 4, marginBottom: 12, transform: "rotate(-2deg)" }}>
              <Text style={{ fontFamily: "Cinzel", fontWeight: 600, fontSize: 9.5, letterSpacing: 1.6, color: COR.negativo }}>
                TRIMESTRE FECHADO SEM REUNIÃO FAMILIAR
              </Text>
            </View>
            {!d.decisoes && (
              <Text style={s.sub}>Nenhum compromisso foi registrado para o {d.proximaSigla}. As decisões deste trimestre ficaram em aberto.</Text>
            )}
          </>
        )}

        {d.decisoes && (
          <View style={{ marginBottom: 6 }}>
            <Text style={[s.sub, { marginBottom: 8 }]}>As decisões foram pedidas pelo Arkad no grupo e respondidas individualmente.</Text>
            <View style={[s.cabecalho, { paddingHorizontal: 4 }]}>
              <Text style={[s.cabTexto, { width: "52%" }]}>DECISÃO</Text>
              {d.decisoes.pessoas.map((p) => (
                <Text key={p} style={[s.cabTexto, { flex: 1 }]}>{p.toUpperCase()}</Text>
              ))}
            </View>
            {d.decisoes.perguntas.map((q) => (
              <View key={q.numero} style={[s.linhaTab, { paddingHorizontal: 4 }]} wrap={false}>
                <View style={{ width: "52%", paddingRight: 8 }}>
                  <Text>
                    <Text style={{ fontWeight: 700 }}>{q.numero}. </Text>
                    {limpo(q.texto)}
                  </Text>
                  {q.divergente && <Text style={{ fontSize: 7.6, color: COR.negativo, marginTop: 2 }}>Respostas diferentes: decidir juntos.</Text>}
                </View>
                {q.respostas.map((r, k) => (
                  <Text key={k} style={{ flex: 1, paddingRight: 4, fontWeight: r ? 600 : 400, color: r ? COR.marinho : COR.suave }}>
                    {r ? limpo(r) : "Sem resposta"}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        <Text style={[s.h2, { marginTop: 14 }]}>Compromissos do trimestre anterior</Text>
        {d.compromissosAnteriores.length === 0 ? (
          <View style={s.caixa}>
            <Text>Não há compromissos do trimestre anterior para conferir. Os deste trimestre serão conferidos no balanço do {d.proximaSigla}.</Text>
          </View>
        ) : (
          d.compromissosAnteriores.map((c, k) => (
            <View key={k} style={s.item} wrap={false}>
              <View style={[s.marca, { backgroundColor: c.cumprido ? COR.positivo : c.cumprido === false ? COR.negativo : COR.suave }]}>
                {c.cumprido ? <Visto /> : <Text style={s.marcaTexto}>{c.cumprido === false ? "×" : "?"}</Text>}
              </View>
              <Text style={{ flex: 1 }}>
                {c.texto}
                <Text style={{ color: COR.suave }}>{c.cumprido ? " · cumprido" : c.cumprido === false ? " · não cumprido" : " · sem conferência"}</Text>
              </Text>
            </View>
          ))
        )}

        <Text style={[s.h1, { marginTop: 22 }]}>6. O próximo trimestre: {d.proximaSigla}</Text>
        <Text style={s.sub}>O que vem pela frente.</Text>
        <View style={s.grade}>
          {d.proximo.map((t, k) => (
            <View key={k} style={{ width: "48.6%", borderBottomWidth: 0.4, borderBottomColor: COR.linha, paddingVertical: 6 }} wrap={false}>
              <Text>
                <Text style={{ fontWeight: 600, color: COR.marinho }}>{t.split(":")[0]}:</Text>
                {t.slice(t.indexOf(":") + 1)}
              </Text>
            </View>
          ))}
        </View>
        <Rodape sigla={d.sigla} />
      </Page>

      {/* 7. PARECER E ASSINATURA */}
      <Page size="A4" style={s.pagina}>
        <Topo sigla={d.sigla} />
        <Text style={[s.h1, { marginBottom: 14 }]}>7. Parecer do conselheiro</Text>
        {d.parecer.map((p, k) => (
          <Text key={k} style={s.parecer}>
            {limpo(p)}
          </Text>
        ))}

        <View style={{ marginTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }} wrap={false}>
          <View>
            <Text style={{ fontFamily: "Pinyon", fontSize: 40, color: COR.marinho, lineHeight: 1.1 }}>Arkad</Text>
            <View style={{ width: 210, borderTopWidth: 0.8, borderTopColor: COR.tinta, marginTop: 2, paddingTop: 5 }}>
              <Text style={{ fontFamily: "Cinzel", fontWeight: 600, letterSpacing: 1.2, color: COR.marinho, fontSize: 8.5 }}>ARKAD</Text>
              <Text style={{ fontSize: 8.5 }}>Conselheiro financeiro da Casa Andrade Muller</Text>
            </View>
          </View>
          <Selo sigla={d.sigla} />
        </View>

        <Text style={{ marginTop: 14, fontSize: 7, color: COR.suave, textAlign: "center" }}>
          Balanço gerado automaticamente em {d.emitidoEm}, a partir dos dados do Andrade Muller Bank. É um documento de acompanhamento da família e não substitui demonstrativo contábil assinado por contador.
        </Text>
        <Rodape sigla={d.sigla} />
      </Page>
    </Document>
  );
}

/** Marca de "feito" desenhada: o ✓ não existe no recorte latino das fontes. */
function Visto() {
  return (
    <Svg width={7} height={7} viewBox="0 0 10 10">
      <Path d="M1.5 5.2 L4 7.6 L8.6 2.6" stroke="#ffffff" strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

function Cartao({ rotulo, valor, extra, det }: { rotulo: string; valor: string; extra?: string; det: string }) {
  return (
    <View style={s.cartao} wrap={false}>
      <Text style={s.cartaoRot}>{rotulo}</Text>
      <Text style={s.cartaoVal}>
        {valor}
        {extra ? <Text style={{ fontSize: 11 }}>{extra}</Text> : null}
      </Text>
      <Text style={s.cartaoDet}>{det}</Text>
    </View>
  );
}

/** Selo do balanço. Texto em arco não existe no react-pdf: o selo é anel, sigla e legenda. */
function Selo({ sigla }: { sigla: string }) {
  return (
    <View style={{ width: 92, height: 92, alignItems: "center", justifyContent: "center" }}>
      <Svg width={92} height={92} viewBox="0 0 92 92" style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={46} cy={46} r={44} stroke={COR.ouro} strokeWidth={1.6} fill="none" />
        <Circle cx={46} cy={46} r={39} stroke={COR.ouro} strokeWidth={0.5} fill="none" />
        <Circle cx={46} cy={46} r={27} stroke={COR.ouro} strokeWidth={0.8} fill="none" />
      </Svg>
      <Text style={{ fontFamily: "Cinzel", fontWeight: 600, fontSize: 13, lineHeight: 1.2, color: COR.marinho }}>{sigla}</Text>
      <Text style={{ fontFamily: "Cinzel", fontWeight: 500, fontSize: 5.5, letterSpacing: 1, color: COR.ouro }}>BALANÇO</Text>
    </View>
  );
}
