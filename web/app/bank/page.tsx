import { createClient } from "@/lib/supabase/server";
import { EstadoSemConfiguracao } from "@/components/bank/home/estado-sem-configuracao";
import { SeletorEntidade } from "@/components/bank/ui/seletor-entidade";
import { HeroPatrimonio } from "@/components/bank/home/hero-patrimonio";
import { ProximaFatura } from "@/components/bank/home/proxima-fatura";
import { PonteProLabore } from "@/components/bank/home/ponte-pro-labore";
import { AcoesRapidas } from "@/components/bank/home/acoes-rapidas";
import { Orcamento503020 } from "@/components/bank/home/orcamento-503020";
import { InvestimentosB3 } from "@/components/bank/home/investimentos-b3";
import { CarteiraArthur } from "@/components/bank/home/carteira-arthur";
import { MetasAtivas } from "@/components/bank/home/metas-ativas";
import { DividasAtivas } from "@/components/bank/home/dividas-ativas";
import { TransacoesRecentes } from "@/components/bank/home/transacoes-recentes";
import { patrimonio } from "@/lib/bank/calculos";
import {
  ENTIDADE_FAMILIA,
  ENTIDADE_ARTHUR,
  ENTIDADE_CONSULTORIA,
  type VisaoEntidade,
  type Transacao,
} from "@/lib/bank/tipos";

function supabaseConfigurado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes("SEU-PROJETO");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  if (!supabaseConfigurado()) {
    return <EstadoSemConfiguracao />;
  }

  const { visao: visaoParam } = await searchParams;
  const visao: VisaoEntidade = visaoParam === "familia" ? "familia" : "consolidado";

  // O CNPJ não é uma visão do Bank — a vida financeira da consultoria fica só no
  // FM Gestão. "Consolidado" = Família + Carteira Arthur; "Família" = só a Família.
  const entidadesDaVisao = visao === "familia" ? [ENTIDADE_FAMILIA] : [ENTIDADE_FAMILIA, ENTIDADE_ARTHUR];

  const supabase = await createClient();

  const [
    { data: contas },
    { data: transacoes },
    { data: cartoesFamilia },
    { data: posicoes },
    { data: cotacoesRaw },
    { data: contasArthur },
    { data: transacoesArthur },
    { data: posicoesArthur },
    { data: metas },
    { data: dividas },
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
    supabase
      .from("dividas")
      .select("id, descricao, valor_total, valor_pago, parcelas_total, parcelas_pagas, data_vencimento_proxima")
      .eq("quitada", false)
      .in("entidade_id", entidadesDaVisao),
  ]);

  const cotacoesMap = new Map(
    (cotacoesRaw ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]),
  );

  const transacoesTyped = (transacoes ?? []) as unknown as Transacao[];

  const valorPatrimonio = patrimonio(contas ?? [], transacoesTyped, posicoes ?? [], cotacoesMap);
  const patrimonioArthur = patrimonio(
    contasArthur ?? [],
    (transacoesArthur ?? []) as unknown as Transacao[],
    posicoesArthur ?? [],
    cotacoesMap,
  );

  // ---------- Próxima fatura em aberto entre os cartões da Família ----------
  const idsCartoesFamilia = (cartoesFamilia ?? []).map((c) => c.id);
  let proximaFatura = null;
  if (idsCartoesFamilia.length > 0) {
    const { data } = await supabase
      .from("faturas_cartao")
      .select("id, cartao_id, competencia, valor_total, paga, data_pagamento, cartao:cartoes(nome)")
      .in("cartao_id", idsCartoesFamilia)
      .eq("paga", false)
      .order("competencia", { ascending: true })
      .limit(1)
      .maybeSingle();
    proximaFatura = data as never;
  }

  // ---------- Ponte pró-labore: distribuições da consultoria (FM Gestão) espelhadas na Família ----------
  const { data: pontesData } = await supabase
    .from("transacoes")
    .select("id, descricao, valor, data")
    .eq("entidade_id", ENTIDADE_CONSULTORIA)
    .not("transacao_vinculada_id", "is", null)
    .order("data", { ascending: false })
    .limit(5);
  const pontes = pontesData ?? [];

  // ---------- Orçamento 50/30/20 (só na visão Família) ----------
  const totalReceita = transacoesTyped
    .filter((t) => t.categoria?.tipo === "receita")
    .reduce((soma, t) => soma + Number(t.valor), 0);
  const gastoPorGrupo: Record<string, number> = {};
  for (const t of transacoesTyped) {
    if (t.categoria?.tipo !== "despesa" || !t.categoria?.grupo_orcamento) continue;
    const chave = t.categoria.grupo_orcamento;
    gastoPorGrupo[chave] = (gastoPorGrupo[chave] ?? 0) + Number(t.valor);
  }

  return (
    <div>
      <SeletorEntidade visaoAtual={visao} />
      <HeroPatrimonio visao={visao} valor={valorPatrimonio} />

      <div className="mb-8 grid grid-cols-2 gap-4">
        <ProximaFatura fatura={proximaFatura} />
        <PonteProLabore pontes={pontes} />
      </div>

      <AcoesRapidas />

      <div className="grid grid-cols-2 gap-6">
        {visao === "familia" && (
          <Orcamento503020 totalReceita={totalReceita} gastoPorGrupo={gastoPorGrupo} />
        )}

        <InvestimentosB3 posicoes={posicoes ?? []} cotacoes={cotacoesMap} />

        <CarteiraArthur patrimonio={patrimonioArthur} posicoes={posicoesArthur ?? []} />

        <MetasAtivas metas={metas ?? []} />

        <DividasAtivas dividas={dividas ?? []} />

        <TransacoesRecentes transacoes={transacoesTyped.slice(0, 8)} />
      </div>
    </div>
  );
}
