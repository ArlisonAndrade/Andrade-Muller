import { createClient } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { RendaFamilia, type RendaDoMes } from "@/components/bank/norte/renda-familia";
import { DivisaoPresets } from "@/components/bank/norte/divisao-presets";
import { CardsResponsavel } from "@/components/bank/norte/cards-responsavel";
import { CartoesVisual } from "@/components/bank/norte/cartoes-visual";
import { ProvedorPrivacidade, BotaoPrivacidade, ValorMoeda } from "@/components/bank/norte/privacidade";
import { mesBR } from "@/lib/bank/formato";
import type { ItemView } from "@/components/bank/norte/tabela-divisao";
import {
  ENTIDADE_FAMILIA,
  NOME_GRUPO,
  tipoRendaDaPessoa,
  type GrupoOrcamento,
  type Pessoa,
  type DivisaoConfig,
  type Cartao,
} from "@/lib/bank/tipos";

function addMeses(competencia: string, n: number) {
  const [ano, mes] = competencia.slice(0, 7).split("-").map(Number);
  const total = (ano * 12 + (mes - 1)) + n;
  const anoNovo = Math.floor(total / 12);
  const mesNovo = (total % 12) + 1;
  return `${anoNovo}-${String(mesNovo).padStart(2, "0")}-01`;
}

export const metadata = { title: "Planejamento" };

type ItemRow = {
  id: string;
  item: string;
  valor: number;
  categoria_id: string | null;
  grupo_orcamento: GrupoOrcamento | null;
  metodo: string | null;
  cartao_id: string | null;
  responsavel_id: string | null;
  transferencia: boolean;
  obs: string | null;
  categoria: { nome: string } | null;
  cartao: { nome: string } | null;
  responsavel: { nome: string } | null;
};

// Aba "Norte" — o orçamento fixo/médio da família (quem ganha, quem paga o
// quê, em qual cartão) como parâmetro do mês. Espelha a página "Orçamento
// Mensal" do Notion, mas tudo editável aqui.
export default async function PaginaNorte({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const supabase = await createClient();

  const hoje = new Date();
  const competenciaAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const competencia = mes && /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : competenciaAtual;

  const [
    { data: pessoasRaw },
    { data: itensRaw },
    { data: categorias },
    { data: cartoesRaw },
    { data: configRaw },
    { data: rendaMesRaw },
  ] = await Promise.all([
    supabase
      .from("pessoas")
      .select("id, entidade_id, nome, cor, renda_base, ordem, ativo")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("orcamento_planejado")
      .select(
        "id, item, valor, categoria_id, grupo_orcamento, metodo, cartao_id, responsavel_id, transferencia, obs, categoria:categorias(nome), cartao:cartoes(nome), responsavel:pessoas(nome)",
      )
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("ativo", true)
      .order("ordem")
      .order("valor", { ascending: false }),
    supabase
      .from("categorias")
      .select("id, nome")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .order("nome"),
    supabase
      .from("cartoes")
      .select("id, entidade_id, nome, titular, bandeira, limite, dia_fechamento, dia_vencimento")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .order("nome"),
    supabase
      .from("divisao_orcamento_config")
      .select("*")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .maybeSingle(),
    supabase
      .from("renda_mensal")
      .select("tipo, valor, confirmado")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("competencia", competencia),
  ]);

  const pessoas = (pessoasRaw ?? []) as Pessoa[];
  const itens = (itensRaw ?? []) as unknown as ItemRow[];
  const cartoes = (cartoesRaw ?? []) as Cartao[];
  const config: DivisaoConfig = configRaw ?? {
    entidade_id: ENTIDADE_FAMILIA,
    preset: "50_30_20",
    pct_essencial: 50,
    pct_liberdade: 30,
    pct_investimento: 20,
    pct_extra: 0,
    extra_nome: null,
  };

  const rendaMesPorTipo = new Map(
    (rendaMesRaw ?? []).map((r) => [r.tipo, { valor: Number(r.valor), confirmado: r.confirmado ?? false }]),
  );
  const rendaPorPessoa = new Map<string, RendaDoMes>(
    pessoas.map((p) => {
      const lancado = rendaMesPorTipo.get(tipoRendaDaPessoa(p.nome));
      return [
        p.id,
        lancado
          ? { valor: lancado.valor, confirmado: lancado.confirmado, temLancamento: true }
          : { valor: Number(p.renda_base), confirmado: false, temLancamento: false },
      ];
    }),
  );
  const rendaTotal = pessoas.reduce((s, p) => s + (rendaPorPessoa.get(p.id)?.valor ?? 0), 0);

  const planejadoPorGrupo: Record<string, number> = {};
  for (const i of itens) {
    if (!i.grupo_orcamento) continue;
    planejadoPorGrupo[i.grupo_orcamento] = (planejadoPorGrupo[i.grupo_orcamento] ?? 0) + Number(i.valor);
  }

  const itensView: ItemView[] = itens.map((i) => ({
    id: i.id,
    item: i.item,
    valor: Number(i.valor),
    categoria_id: i.categoria_id,
    grupo_orcamento: i.grupo_orcamento,
    metodo: i.metodo,
    cartao_id: i.cartao_id,
    cartaoNome: i.cartao?.nome ?? null,
    categoriaNome: i.categoria?.nome ?? null,
    responsavel_id: i.responsavel_id,
    responsavelNome: i.responsavel?.nome ?? null,
    transferencia: i.transferencia,
    obs: i.obs,
  }));

  const gruposBarra: { chave: GrupoOrcamento; pct: number }[] = [
    { chave: "essencial_50", pct: Number(config.pct_essencial) },
    { chave: "liberdade_30", pct: Number(config.pct_liberdade) },
    { chave: "investimento_20", pct: Number(config.pct_investimento) },
  ];

  const opcoesPessoas = pessoas.map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <ProvedorPrivacidade>
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Planejamento</h1>
          <p className="text-sm text-text-faint">
            O plano fixo do mês — renda de cada um, quem paga o quê e em qual cartão. É a
            meta que o dia a dia (Extrato) persegue.
          </p>
        </div>
        <BotaoPrivacidade />
      </div>

      <RendaFamilia
        pessoas={pessoas}
        competencia={competencia}
        rendaPorPessoa={rendaPorPessoa}
        rotuloMes={mesBR(competencia)}
        mesAnteriorHref={`/bank/norte?mes=${addMeses(competencia, -1).slice(0, 7)}`}
        mesProximoHref={`/bank/norte?mes=${addMeses(competencia, 1).slice(0, 7)}`}
      />

      <DivisaoPresets entidadeId={ENTIDADE_FAMILIA} config={config} rendaTotal={rendaTotal} />

      <section className="card-bank p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">Sua divisão hoje</h2>
        <div className="flex flex-col gap-4">
          {gruposBarra.map(({ chave, pct }) => {
            const meta = (rendaTotal * pct) / 100;
            const planejado = planejadoPorGrupo[chave] ?? 0;
            const pctBarra = meta > 0 ? Math.min(100, (planejado / meta) * 100) : 0;
            const estourou = meta > 0 && planejado > meta;
            return (
              <div key={chave}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-text-primary">
                    {NOME_GRUPO[chave]} <span className="text-text-faint">{pct}%</span>
                  </span>
                  <span className="text-text-secondary">
                    <ValorMoeda valor={planejado} /> <span className="text-text-faint">/ <ValorMoeda valor={meta} /></span>
                  </span>
                </div>
                <ProgressBar
                  percentual={pctBarra}
                  cor={estourou ? "var(--color-bank-negativo)" : "var(--color-bank-positivo)"}
                />
              </div>
            );
          })}
          {config.pct_extra > 0 && (
            <div className="flex items-baseline justify-between border-t border-border pt-3 text-sm">
              <span className="text-text-primary">{config.extra_nome ?? "Extra"}</span>
              <span className="text-text-secondary">
                <ValorMoeda valor={(rendaTotal * Number(config.pct_extra)) / 100} /> (meta)
              </span>
            </div>
          )}
        </div>
      </section>

      <CardsResponsavel
        entidadeId={ENTIDADE_FAMILIA}
        pessoas={pessoas}
        itens={itensView}
        categorias={categorias ?? []}
        cartoes={cartoes.map((c) => ({ id: c.id, nome: c.nome }))}
      />

      <CartoesVisual
        entidadeId={ENTIDADE_FAMILIA}
        cartoes={cartoes}
        itens={itensView}
        pessoas={opcoesPessoas}
        categorias={categorias ?? []}
      />
    </div>
    </ProvedorPrivacidade>
  );
}
