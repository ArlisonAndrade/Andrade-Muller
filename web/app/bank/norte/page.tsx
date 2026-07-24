import { createClient } from "@/lib/supabase/server";
import { moedaBRL } from "@/lib/bank/formato";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { TabelaDivisao, type ItemView } from "@/components/bank/norte/tabela-divisao";
import { atualizarRendaPessoa } from "@/lib/bank/acoes/norte";
import {
  ENTIDADE_FAMILIA,
  ROTULO_GRUPO,
  PCT_GRUPO,
  type GrupoOrcamento,
  type Pessoa,
} from "@/lib/bank/tipos";

export const metadata = { title: "Norte" };

type ItemRow = {
  id: string;
  item: string;
  valor: number;
  categoria_id: string | null;
  grupo_orcamento: GrupoOrcamento | null;
  metodo: string | null;
  cartao_id: string | null;
  responsavel_id: string | null;
  obs: string | null;
  categoria: { nome: string } | null;
  cartao: { nome: string } | null;
  responsavel: { nome: string } | null;
};

// Aba "Norte" — o orçamento fixo/médio da família (quem ganha, quem paga o
// quê, em qual cartão) como parâmetro do mês. Espelha a página "Orçamento
// Mensal" do Notion, mas tudo editável aqui.
export default async function PaginaNorte() {
  const supabase = await createClient();

  const [{ data: pessoasRaw }, { data: itensRaw }, { data: categorias }, { data: cartoes }] =
    await Promise.all([
      supabase
        .from("pessoas")
        .select("id, entidade_id, nome, cor, renda_base, ordem, ativo")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .eq("ativo", true)
        .order("ordem"),
      supabase
        .from("orcamento_planejado")
        .select(
          "id, item, valor, categoria_id, grupo_orcamento, metodo, cartao_id, responsavel_id, obs, categoria:categorias(nome), cartao:cartoes(nome), responsavel:pessoas(nome)",
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
        .select("id, nome")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
    ]);

  const pessoas = (pessoasRaw ?? []) as Pessoa[];
  const itens = (itensRaw ?? []) as unknown as ItemRow[];

  const rendaTotal = pessoas.reduce((s, p) => s + Number(p.renda_base), 0);

  // Planejado por grupo 50/30/20.
  const planejadoPorGrupo: Record<string, number> = {};
  for (const i of itens) {
    if (!i.grupo_orcamento) continue;
    planejadoPorGrupo[i.grupo_orcamento] =
      (planejadoPorGrupo[i.grupo_orcamento] ?? 0) + Number(i.valor);
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
    obs: i.obs,
  }));

  const gruposMeta = Object.keys(PCT_GRUPO) as (keyof typeof PCT_GRUPO)[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Norte</h1>
        <p className="text-sm text-text-faint">
          O plano fixo do mês — renda de cada um, quem paga o quê e em qual cartão. É a
          meta que o dia a dia (Extrato) persegue.
        </p>
      </div>

      {/* Renda da família */}
      <section className="card-bank p-4 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Renda da família</h2>
          <span className="text-sm font-semibold text-bank-positivo">
            {moedaBRL(rendaTotal)}/mês
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {pessoas.length === 0 && (
            <p className="text-sm text-text-faint">
              Nenhuma pessoa cadastrada. Rode a migration 10_norte.sql para semear Arlison e
              Franciele.
            </p>
          )}
          {pessoas.map((p) => (
            <form
              key={p.id}
              action={atualizarRendaPessoa}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="id" value={p.id} />
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: p.cor ?? "var(--color-bank-primaria)" }}
              />
              <span className="w-28 shrink-0 text-sm text-text-primary">{p.nome}</span>
              <input
                name="renda_base"
                type="number"
                step="0.01"
                min="0"
                defaultValue={Number(p.renda_base)}
                className="w-36 rounded-[8px] border border-border bg-surface-1 px-3 py-1.5 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-[8px] border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                Salvar
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* Metas 50/30/20: meta (sobre a renda) vs planejado */}
      <section className="card-bank p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">Divisão 50/30/20</h2>
        <div className="flex flex-col gap-4">
          {gruposMeta.map((g) => {
            const meta = rendaTotal * PCT_GRUPO[g];
            const planejado = planejadoPorGrupo[g] ?? 0;
            const pct = meta > 0 ? Math.min(100, (planejado / meta) * 100) : 0;
            const estourou = meta > 0 && planejado > meta;
            return (
              <div key={g}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-text-primary">{ROTULO_GRUPO[g as GrupoOrcamento]}</span>
                  <span className="text-text-secondary">
                    {moedaBRL(planejado)}{" "}
                    <span className="text-text-faint">/ {moedaBRL(meta)}</span>
                  </span>
                </div>
                <ProgressBar
                  percentual={pct}
                  cor={estourou ? "var(--color-bank-negativo)" : "var(--color-bank-positivo)"}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Divisão dos pagamentos (o "Norte" das saídas) */}
      <TabelaDivisao
        entidadeId={ENTIDADE_FAMILIA}
        itens={itensView}
        pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
        categorias={categorias ?? []}
        cartoes={cartoes ?? []}
      />
    </div>
  );
}
