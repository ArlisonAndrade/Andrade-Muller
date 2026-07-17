import { useCallback, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, View, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { SourceSerif4_500Medium } from "@expo-google-fonts/source-serif-4";

import { Nav } from "./components/Nav";
import { EstadoSemConfiguracao } from "./components/EstadoSemConfiguracao";
import { SeletorEntidade } from "./components/SeletorEntidade";
import { HeroPatrimonio } from "./components/HeroPatrimonio";
import { ProximaFatura } from "./components/ProximaFatura";
import { PonteProLabore } from "./components/PonteProLabore";
import { AcoesRapidas } from "./components/AcoesRapidas";
import { Orcamento503020 } from "./components/Orcamento503020";
import { InvestimentosB3 } from "./components/InvestimentosB3";
import { CarteiraArthur } from "./components/CarteiraArthur";
import { MetasAtivas } from "./components/MetasAtivas";
import { TransacoesRecentes } from "./components/TransacoesRecentes";

import { supabase, supabaseConfigurado } from "./lib/supabase";
import { patrimonio } from "./lib/calculos";
import { cores } from "./lib/tema";
import {
  ENTIDADE_FAMILIA,
  ENTIDADE_ARTHUR,
  ENTIDADE_CONSULTORIA,
  type VisaoEntidade,
  type Transacao,
  type Meta,
  type PosicaoAtivo,
} from "./lib/tipos";

SplashScreen.preventAutoHideAsync();

type FaturaCartao = {
  valor_total: number | null;
  competencia: string;
  cartao?: { nome: string } | null;
} | null;

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    SourceSerif4_500Medium,
  });

  const [visao, setVisao] = useState<VisaoEntidade>("consolidado");
  const [carregando, setCarregando] = useState(true);
  const [valorPatrimonio, setValorPatrimonio] = useState(0);
  const [patrimonioArthur, setPatrimonioArthur] = useState(0);
  const [proximaFatura, setProximaFatura] = useState<FaturaCartao>(null);
  const [pontes, setPontes] = useState<{ id: string; descricao: string; valor: number; data: string }[]>([]);
  const [totalReceita, setTotalReceita] = useState(0);
  const [gastoPorGrupo, setGastoPorGrupo] = useState<Record<string, number>>({});
  const [posicoes, setPosicoes] = useState<PosicaoAtivo[]>([]);
  const [posicoesArthur, setPosicoesArthur] = useState<PosicaoAtivo[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [cotacoes, setCotacoes] = useState<Map<string, number>>(new Map());

  const carregarDados = useCallback(async (visaoAtual: VisaoEntidade) => {
    if (!supabaseConfigurado()) {
      setCarregando(false);
      return;
    }
    setCarregando(true);

    // O CNPJ não é uma visão do Bank — a vida financeira da consultoria fica só
    // no FM Gestão. "Consolidado" = Família + Carteira Arthur; "Família" = só a Família.
    const entidadesDaVisao =
      visaoAtual === "familia" ? [ENTIDADE_FAMILIA] : [ENTIDADE_FAMILIA, ENTIDADE_ARTHUR];

    const [
      { data: contas },
      { data: transacoesData },
      { data: cartoesDaVisao },
      { data: posicoesData },
      { data: cotacoesRaw },
      { data: contasArthur },
      { data: transacoesArthur },
      { data: posicoesArthurData },
      { data: metasData },
    ] = await Promise.all([
      supabase.from("contas").select("id, entidade_id, saldo_inicial").in("entidade_id", entidadesDaVisao),
      supabase
        .from("transacoes")
        .select("id, entidade_id, descricao, valor, data, transacao_vinculada_id, categoria:categorias(nome, tipo, grupo_orcamento)")
        .in("entidade_id", entidadesDaVisao)
        .order("data", { ascending: false }),
      supabase.from("cartoes").select("id").eq("entidade_id", ENTIDADE_FAMILIA),
      supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_FAMILIA),
      supabase.from("cotacoes_atuais").select("ativo_id, preco_atual"),
      supabase.from("contas").select("id, saldo_inicial").eq("entidade_id", ENTIDADE_ARTHUR),
      supabase.from("transacoes").select("valor, categoria:categorias(tipo)").eq("entidade_id", ENTIDADE_ARTHUR),
      supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_ARTHUR),
      supabase.from("metas").select("*").eq("status", "em_andamento").in("entidade_id", entidadesDaVisao),
    ]);

    const cotacoesMap = new Map((cotacoesRaw ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]));
    const transacoesTyped = (transacoesData ?? []) as unknown as Transacao[];

    setValorPatrimonio(patrimonio(contas ?? [], transacoesTyped, posicoesData ?? [], cotacoesMap));
    setPatrimonioArthur(
      patrimonio(contasArthur ?? [], (transacoesArthur ?? []) as unknown as Transacao[], posicoesArthurData ?? [], cotacoesMap),
    );
    setPosicoes(posicoesData ?? []);
    setPosicoesArthur(posicoesArthurData ?? []);
    setMetas(metasData ?? []);
    setTransacoes(transacoesTyped.slice(0, 8));
    setCotacoes(cotacoesMap);

    const receita = transacoesTyped
      .filter((t) => t.categoria?.tipo === "receita")
      .reduce((soma, t) => soma + Number(t.valor), 0);
    setTotalReceita(receita);

    const gastos: Record<string, number> = {};
    for (const t of transacoesTyped) {
      if (t.categoria?.tipo !== "despesa" || !t.categoria?.grupo_orcamento) continue;
      gastos[t.categoria.grupo_orcamento] = (gastos[t.categoria.grupo_orcamento] ?? 0) + Number(t.valor);
    }
    setGastoPorGrupo(gastos);

    const idsCartoes = (cartoesDaVisao ?? []).map((c) => c.id);
    if (idsCartoes.length > 0) {
      const { data: fatura } = await supabase
        .from("faturas_cartao")
        .select("valor_total, competencia, paga, cartao:cartoes(nome)")
        .in("cartao_id", idsCartoes)
        .eq("paga", false)
        .order("competencia", { ascending: true })
        .limit(1)
        .maybeSingle();
      setProximaFatura(fatura as FaturaCartao);
    } else {
      setProximaFatura(null);
    }

    const { data: pontesData } = await supabase
      .from("transacoes")
      .select("id, descricao, valor, data")
      .eq("entidade_id", ENTIDADE_CONSULTORIA)
      .not("transacao_vinculada_id", "is", null)
      .order("data", { ascending: false })
      .limit(5);
    setPontes(pontesData ?? []);

    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarDados(visao);
  }, [carregarDados, visao]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="dark" />
      <Nav />
      {!supabaseConfigurado() ? (
        <EstadoSemConfiguracao />
      ) : carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator color={cores.textPrimary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.conteudo}>
          <SeletorEntidade visaoAtual={visao} onMudar={setVisao} />
          <HeroPatrimonio visao={visao} valor={valorPatrimonio} />

          <View style={{ gap: 14, marginBottom: 24 }}>
            <ProximaFatura fatura={proximaFatura} />
            <PonteProLabore pontes={pontes} />
          </View>

          <AcoesRapidas />

          <View style={{ gap: 20 }}>
            {visao === "familia" && (
              <Orcamento503020 totalReceita={totalReceita} gastoPorGrupo={gastoPorGrupo} />
            )}
            <InvestimentosB3 posicoes={posicoes} cotacoes={cotacoes} />
            <CarteiraArthur patrimonio={patrimonioArthur} posicoes={posicoesArthur} />
            <MetasAtivas metas={metas} />
            <TransacoesRecentes transacoes={transacoes} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.surface2 },
  conteudo: { padding: 20, paddingBottom: 40 },
  carregando: { flex: 1, alignItems: "center", justifyContent: "center" },
});
