import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { moedaBRL } from "@/lib/bank/formato";
import {
  agregarPorClasse,
  rentabilidade12M,
  type Cotacao,
  type PosicaoDetalhada,
} from "@/lib/bank/calculos-investimentos";
import { CLASSES_ATIVOS, classeDe } from "@/lib/bank/classes-ativos";
import {
  acaoAtualizarCotacoes,
  garantirSnapshotDoMes,
  registrarProvento,
} from "@/lib/bank/acoes/investimentos";
import { CardMetrica } from "@/components/bank/ui/card-metrica";
import { BadgeVariacao } from "@/components/bank/ui/badge-variacao";
import { LinhaClasse } from "@/components/bank/investimentos/linha-classe";
import { DonutAlocacao } from "@/components/bank/investimentos/donut-alocacao";
import { EvolucaoPatrimonio } from "@/components/bank/investimentos/evolucao-patrimonio";
import {
  IconRefresh,
  IconPlus,
  IconPigMoney,
  IconChartLine,
  IconCoins,
  IconTrendingUp,
} from "@/components/bank/ui/icones";

export const metadata = { title: "Investimentos" };

// Painel de investimentos da carteira da Família — estrutura do painel
// que o Arlison usa hoje no Investidor10, alimentado pelos dados próprios.
export default async function PaginaInvestimentos() {
  // Foto do mês antes de ler (idempotente; refresca valores do mês corrente).
  await garantirSnapshotDoMes();

  const supabase = await createClient();
  const dozeMesesAtras = new Date();
  dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);
  const corte12M = dozeMesesAtras.toISOString().slice(0, 10);

  const [
    { data: posicoes },
    { data: cotacoes },
    { data: metas },
    { data: snapshots },
    { data: proventos },
  ] = await Promise.all([
    supabase
      .from("posicao_ativos")
      .select("entidade_id, ativo_id, ticker, tipo, quantidade_atual, preco_medio")
      .eq("entidade_id", ENTIDADE_FAMILIA),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual, variacao_dia_pct"),
    supabase
      .from("metas_alocacao")
      .select("classe, percentual_alvo")
      .eq("entidade_id", ENTIDADE_FAMILIA),
    supabase
      .from("snapshots_patrimonio")
      .select("competencia, valor_aplicado, valor_mercado")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .gte("competencia", corte12M)
      .order("competencia"),
    supabase
      .from("proventos")
      .select("valor, data")
      .eq("entidade_id", ENTIDADE_FAMILIA),
  ]);

  const mapaCotacoes = new Map<string, Cotacao>(
    (cotacoes ?? []).map((c) => [
      c.ativo_id,
      { preco_atual: c.preco_atual, variacao_dia_pct: c.variacao_dia_pct },
    ]),
  );
  const mapaMetas = new Map<string, number>(
    (metas ?? []).map((m) => [m.classe, Number(m.percentual_alvo)]),
  );

  const classes = agregarPorClasse(
    (posicoes ?? []) as PosicaoDetalhada[],
    mapaCotacoes,
    mapaMetas,
  );

  const valorAplicado = classes.reduce((s, c) => s + c.valorAplicado, 0);
  const valorMercado = classes.reduce((s, c) => s + c.valorMercado, 0);
  const ganhoCapital = valorMercado - valorAplicado;
  const proventosTotal = (proventos ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const proventos12M = (proventos ?? [])
    .filter((p) => p.data >= corte12M)
    .reduce((s, p) => s + Number(p.valor), 0);
  const lucroTotal = ganhoCapital + proventosTotal;
  const rentabTotal = valorAplicado > 0 ? (lucroTotal / valorAplicado) * 100 : null;
  const rentab12M = rentabilidade12M(
    (snapshots ?? []).map((s) => ({
      competencia: String(s.competencia),
      valor_aplicado: Number(s.valor_aplicado),
      valor_mercado: Number(s.valor_mercado),
    })),
    valorAplicado,
    valorMercado,
  );

  // Variação do dia do patrimônio (ponderada pelas classes com cotação).
  const classesComVariacao = classes.filter(
    (c) => c.variacaoDiaPct != null && c.valorMercado > 0,
  );
  const pesoVariacao = classesComVariacao.reduce((s, c) => s + c.valorMercado, 0);
  const variacaoDia =
    pesoVariacao > 0
      ? classesComVariacao.reduce(
          (s, c) => s + (c.variacaoDiaPct as number) * c.valorMercado,
          0,
        ) / pesoVariacao
      : undefined;

  const totalAtivos = classes.reduce((s, c) => s + c.quantidadeAtivos, 0);

  // Ativos pra o select de proventos.
  const listaAtivos = (posicoes ?? [])
    .filter((p) => Number(p.quantidade_atual) > 0)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho + ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Investimentos</h1>
        <div className="flex gap-2">
          <form action={acaoAtualizarCotacoes}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              <IconRefresh size={16} stroke={1.8} /> Atualizar cotações
            </button>
          </form>
          <Link
            href="/bank/investimentos/novo"
            className="flex items-center gap-1.5 rounded-[8px] bg-bank-primaria px-3 py-2 text-sm font-medium text-white"
          >
            <IconPlus size={16} stroke={2} /> Nova compra
          </Link>
        </div>
      </div>

      {/* 4 métricas do topo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica
          label="Patrimônio total"
          valor={moedaBRL(valorMercado)}
          variacaoPct={variacaoDia}
          apoio={<>Valor investido {moedaBRL(valorAplicado)}</>}
          icone={<IconPigMoney size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Lucro total"
          valor={moedaBRL(lucroTotal)}
          corValor={lucroTotal >= 0 ? "text-bank-positivo" : "text-bank-negativo"}
          apoio={
            <>
              Ganho de capital {moedaBRL(ganhoCapital)} · Proventos {moedaBRL(proventosTotal)}
            </>
          }
          icone={<IconTrendingUp size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Proventos (12M)"
          valor={moedaBRL(proventos12M)}
          apoio={<>Total {moedaBRL(proventosTotal)}</>}
          icone={<IconCoins size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Rentabilidade"
          valor={
            rentab12M != null
              ? `${rentab12M.toFixed(2).replace(".", ",")}%`
              : rentabTotal != null
                ? `${rentabTotal.toFixed(2).replace(".", ",")}%`
                : "—"
          }
          apoio={
            rentab12M != null ? (
              <>
                12 meses · Total{" "}
                {rentabTotal != null ? `${rentabTotal.toFixed(2).replace(".", ",")}%` : "—"}
              </>
            ) : (
              <>Total desde o início</>
            )
          }
          icone={<IconChartLine size={18} stroke={1.7} />}
        />
      </div>

      {/* Evolução + alocação */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card-bank p-4 sm:p-5 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold">Evolução do patrimônio</h2>
          <EvolucaoPatrimonio
            pontos={(snapshots ?? []).map((s) => ({
              competencia: String(s.competencia),
              valorAplicado: Number(s.valor_aplicado),
              ganho: Number(s.valor_mercado) - Number(s.valor_aplicado),
            }))}
          />
        </section>
        <section className="card-bank p-4 sm:p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Ativos na carteira</h2>
          {classes.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-faint">
              Cadastre a primeira posição pra ver a alocação.
            </p>
          ) : (
            <DonutAlocacao
              fatias={classes.map((c) => ({
                rotulo: CLASSES_ATIVOS[c.classe].rotuloCurto,
                valor: c.valorMercado,
                cor: CLASSES_ATIVOS[c.classe].cor,
              }))}
            />
          )}
        </section>
      </div>

      {/* Meus Ativos por classe */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">
          Meus Ativos <span className="font-normal text-text-faint">({totalAtivos})</span>
        </h2>
        {classes.length === 0 && (
          <div className="card-bank p-6 text-sm text-text-faint">
            Nenhum ativo em carteira ainda.{" "}
            <Link href="/bank/investimentos/novo" className="text-bank-primaria underline">
              Registrar a primeira compra
            </Link>
            . Pra replicar sua carteira do Investidor10, cadastre cada ativo com a
            quantidade e o preço médio atuais.
          </div>
        )}
        {classes.map((c) => (
          <LinhaClasse
            key={c.classe}
            resumo={c}
            classe={c.classe}
            rotulo={CLASSES_ATIVOS[c.classe].rotulo}
            cor={CLASSES_ATIVOS[c.classe].cor}
          />
        ))}
      </section>

      {/* Registrar provento */}
      <section className="card-bank p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Registrar provento</h2>
        <p className="mt-1 text-xs text-text-faint">
          Dividendos, JCP e rendimentos entram no "Lucro total" e no "Proventos (12M)".
        </p>
        <form
          action={registrarProvento}
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"
        >
          <input type="hidden" name="entidade_id" value={ENTIDADE_FAMILIA} />
          <select
            name="ativo_id"
            className="rounded-[8px] border border-border bg-surface-2 px-2 py-2 text-sm outline-none"
            defaultValue=""
          >
            <option value="">Ativo —</option>
            {listaAtivos.map((a) => (
              <option key={a.ativo_id} value={a.ativo_id}>
                {a.ticker}
              </option>
            ))}
          </select>
          <select
            name="tipo"
            required
            className="rounded-[8px] border border-border bg-surface-2 px-2 py-2 text-sm outline-none"
            defaultValue="dividendo"
          >
            <option value="dividendo">Dividendo</option>
            <option value="jcp">JCP</option>
            <option value="rendimento">Rendimento</option>
            <option value="juros">Juros</option>
          </select>
          <input
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Valor"
            className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-faint"
          />
          <input
            name="data"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-[8px] bg-bank-primaria px-3 py-2 text-sm font-medium text-white"
          >
            Registrar
          </button>
        </form>
      </section>

      {/* Nota sobre classes com % acima da meta */}
      {classes.some(
        (c) => c.percentualAlvo != null && c.percentualCarteira > c.percentualAlvo,
      ) && (
        <p className="text-xs text-text-faint">
          % em vermelho = classe acima da meta de alocação. Metas atuais:{" "}
          {[...mapaMetas.entries()]
            .map(([classe, alvo]) => `${CLASSES_ATIVOS[classeDe(classe)].rotuloCurto} ${alvo}%`)
            .join(" · ")}
          .
        </p>
      )}
    </div>
  );
}
