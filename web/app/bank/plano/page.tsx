import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { moedaBRL } from "@/lib/bank/formato";
import { CardMetrica } from "@/components/bank/ui/card-metrica";
import { SimuladorPlano } from "@/components/bank/plano/simulador";
import { IconTarget, IconTrendingUp } from "@/components/bank/ui/icones";

export const metadata = { title: "Plano" };

// Plano patrimonial dos R$ 6 milhões: real vs plano do ano, simulador
// interativo (sliders de aporte/rentabilidade) e a curva editável 2025→2049.
export default async function PaginaPlano() {
  const supabase = await createClient();
  const anoAtual = new Date().getFullYear();

  const [
    { data: curva },
    { data: parametros },
    { data: posicoes },
    { data: cotacoes },
    { data: contas },
  ] = await Promise.all([
    supabase
      .from("plano_patrimonio")
      .select("id, ano, aporte_planejado, valor_alvo")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .order("ano"),
    supabase
      .from("parametros_plano")
      .select("chave, valor")
      .eq("entidade_id", ENTIDADE_FAMILIA),
    supabase
      .from("posicao_ativos")
      .select("quantidade_atual, preco_medio, ativo_id")
      .eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual"),
    supabase.from("contas").select("saldo_inicial").eq("entidade_id", ENTIDADE_FAMILIA),
  ]);

  const precoAtual = new Map((cotacoes ?? []).map((c) => [c.ativo_id, Number(c.preco_atual ?? 0)]));
  const investido = (posicoes ?? [])
    .filter((p) => Number(p.quantidade_atual) > 0)
    .reduce((s, p) => {
      const preco = precoAtual.get(p.ativo_id) || Number(p.preco_medio ?? 0);
      return s + Number(p.quantidade_atual) * preco;
    }, 0);
  const saldoContas = (contas ?? []).reduce((s, c) => s + Number(c.saldo_inicial), 0);
  const patrimonioAtual = investido + saldoContas;

  const params = new Map((parametros ?? []).map((p) => [p.chave, Number(p.valor)]));
  const aporteMensal = params.get("plano6m_aporte_mensal") ?? 1000;
  const rentabilidade = params.get("plano6m_rentabilidade_aa") ?? 12;
  const crescimentoAporte = params.get("plano6m_crescimento_aporte_aa") ?? 0;

  const alvoAno = (curva ?? []).find((c) => c.ano === anoAtual);
  const posicaoVsPlano =
    alvoAno && Number(alvoAno.valor_alvo) > 0
      ? (patrimonioAtual / Number(alvoAno.valor_alvo) - 1) * 100
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Plano dos R$ 6 milhões</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A curva que você mantém na planilha, agora viva: compara com o
          patrimônio real e deixa você simular caminhos.
        </p>
      </div>

      {/* Real vs plano */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardMetrica
          label="Patrimônio hoje"
          valor={moedaBRL(patrimonioAtual)}
          apoio={<>investimentos + saldo em conta</>}
          icone={<IconTrendingUp size={18} stroke={1.7} />}
        />
        <CardMetrica
          label={`Alvo do plano (${anoAtual})`}
          valor={alvoAno ? moedaBRL(Number(alvoAno.valor_alvo)) : "—"}
          apoio={
            alvoAno ? <>aporte planejado {moedaBRL(Number(alvoAno.aporte_planejado))}/ano</> : undefined
          }
          icone={<IconTarget size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Você está"
          valor={
            posicaoVsPlano != null
              ? `${posicaoVsPlano >= 0 ? "+" : ""}${posicaoVsPlano.toFixed(1).replace(".", ",")}%`
              : "—"
          }
          corValor={
            posicaoVsPlano == null
              ? "text-text-primary"
              : posicaoVsPlano >= 0
                ? "text-bank-positivo"
                : "text-bank-negativo"
          }
          apoio={
            posicaoVsPlano != null ? (
              <>{posicaoVsPlano >= 0 ? "à frente" : "atrás"} do plano de {anoAtual}</>
            ) : undefined
          }
        />
      </div>

      {/* Simulador */}
      <section className="card-bank p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">Simulador</h2>
        <SimuladorPlano
          entidadeId={ENTIDADE_FAMILIA}
          patrimonioAtual={patrimonioAtual}
          curvaPlano={(curva ?? []).map((c) => ({ ano: c.ano, valor_alvo: Number(c.valor_alvo) }))}
          aporteInicial={aporteMensal}
          rentabilidadeInicial={rentabilidade}
          crescimentoAporteInicial={crescimentoAporte}
        />
      </section>
    </div>
  );
}
