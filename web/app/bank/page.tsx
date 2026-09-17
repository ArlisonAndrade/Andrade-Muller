import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EstadoSemConfiguracao } from "@/components/bank/home/estado-sem-configuracao";
import { CarteiraArthur } from "@/components/bank/home/carteira-arthur";
import { MetasAtivas } from "@/components/bank/home/metas-ativas";
import { DividasAtivas } from "@/components/bank/home/dividas-ativas";
import { ScoreSaude } from "@/components/bank/home/score-saude";
import { calcularScoreSaude } from "@/lib/bank/score";
import { JornadaPatrimonio } from "@/components/bank/home/jornada-patrimonio";
import { montarJornada } from "@/lib/bank/jornada";
import { patrimonio, valorInvestido } from "@/lib/bank/calculos";
import { classeDe, finalidadeDaClasse } from "@/lib/bank/classes-ativos";
import { gerarRecorrenciasPendentes } from "@/lib/bank/acoes/recorrencias";
import { garantirSnapshotDoMes } from "@/lib/bank/acoes/investimentos";
import { baixarParcelasAutomaticas } from "@/lib/bank/dividas-automaticas";
import { conquistasParaCelebrar } from "@/lib/bank/conquistas";
import { CelebracaoConquistas } from "@/components/bank/conquistas/celebracao";
import {
  ENTIDADE_FAMILIA,
  ENTIDADE_ARTHUR,
  type Transacao,
} from "@/lib/bank/tipos";

function supabaseConfigurado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes("SEU-PROJETO");
}

export default async function Home() {
  if (!supabaseConfigurado()) {
    return <EstadoSemConfiguracao />;
  }

  const supabase = await createClient();

  // Materializa recorrências, a foto mensal e a baixa do consignado antes das
  // queries (idempotentes) — o score e a jornada leem as parcelas já baixadas.
  await gerarRecorrenciasPendentes();
  await garantirSnapshotDoMes();
  await baixarParcelasAutomaticas(supabase);

  // A Home é a visão da Família. Arthur tem aba própria (mas mantém um card
  // glanceável aqui) e o CNPJ vive só no FM Gestão.
  const entidadesDaVisao = [ENTIDADE_FAMILIA];

  const [
    { data: posicoes },
    { data: cotacoesRaw },
    { data: contasArthur },
    { data: transacoesArthur },
    { data: posicoesArthur },
    { data: metas },
    { data: dividas },
  ] = await Promise.all([
    supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual, variacao_dia_pct"),
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

  // Score de saúde financeira (sempre baseado na Família).
  const score = await calcularScoreSaude(supabase);

  const cotacoesMap = new Map(
    (cotacoesRaw ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]),
  );

  // Fundos + Cripto são a carteira do Arthur por decisão do Arlison (ver
  // finalidadeDaClasse) — ainda guardados na entidade Família, sem carteira
  // própria migrada, então entram aqui além do que já está em ENTIDADE_ARTHUR.
  const posicoesArthurNaFamilia = (posicoes ?? []).filter(
    (p) => finalidadeDaClasse(classeDe(p.tipo)) === "arthur",
  );
  const patrimonioArthur = patrimonio(
    contasArthur ?? [],
    (transacoesArthur ?? []) as unknown as Transacao[],
    [...(posicoesArthur ?? []), ...posicoesArthurNaFamilia],
    cotacoesMap,
  );
  const investidoFamilia = valorInvestido(posicoes ?? [], cotacoesMap);

  // A jornada parte do investido real de hoje: o passado vem da tabela curada,
  // o futuro é recalculado com o cronograma das parcelas e o aporte do plano.
  const jornada = await montarJornada(supabase, investidoFamilia);

  // Medalha conquistada (pela sincronização, pelo resumo das 21h ou pela
  // página do plano) comemora na primeira abertura do site — só lê, não avalia.
  const paraCelebrar = await conquistasParaCelebrar(supabase);

  return (
    <div className="flex flex-col gap-6">
      <CelebracaoConquistas conquistas={paraCelebrar} />
      {/* A jornada, em largura total */}
      <section className="card-bank p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">A jornada do patrimônio</h2>
          <div className="flex items-center gap-3">
            <Link href="/bank/plano" className="text-xs text-bank-primaria underline">
              plano completo
            </Link>
            {/* Modo TV único: a apresentação da reunião trimestral (17/set/2026) */}
            <Link
              href="/bank/tv"
              className="rounded-[8px] border border-border bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              📺 Modo TV
            </Link>
          </div>
        </div>
        <JornadaPatrimonio jornada={jornada} />
      </section>

      {/* Grade de módulos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreSaude score={score} />
        <CarteiraArthur
          patrimonio={patrimonioArthur}
          posicoes={[...(posicoesArthur ?? []), ...posicoesArthurNaFamilia]}
        />
        <DividasAtivas dividas={dividas ?? []} />
        <MetasAtivas metas={metas ?? []} />
      </div>
    </div>
  );
}
