import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { moedaBRL, dataBR, mesBR } from "@/lib/bank/formato";
import {
  categorizarLancamento,
  confirmarImportacao,
} from "@/lib/bank/acoes/importacao";
import { IconCheck } from "@/components/bank/ui/icones";

export const metadata = { title: "Revisar importação" };

// Revisão da fatura importada: pendentes no topo (com select de categoria e
// opção de virar regra), categorizados embaixo. Confirmar gera as transações.
export default async function RevisarImportacao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: importacao } = await supabase
    .from("importacoes_fatura")
    .select("id, fatura_id, nome_arquivo, status, fatura:faturas_cartao(competencia, valor_total, cartao:cartoes(nome))")
    .eq("id", id)
    .maybeSingle();
  if (!importacao) notFound();

  const fatura = importacao.fatura as unknown as {
    competencia: string;
    valor_total: number | null;
    cartao: { nome: string } | null;
  };

  const [{ data: lancamentos }, { data: categorias }] = await Promise.all([
    supabase
      .from("lancamentos_cartao")
      .select("id, categoria_id, descricao, valor, data, parcela_atual, parcela_total, categorizado_automaticamente, transacao_id")
      .eq("fatura_id", importacao.fatura_id)
      .order("data"),
    supabase
      .from("categorias")
      .select("id, nome")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("tipo", "despesa")
      .order("nome"),
  ]);

  const lista = lancamentos ?? [];
  const pendentes = lista.filter((l) => !l.categoria_id);
  const categorizados = lista.filter((l) => l.categoria_id);
  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nome]));
  const total = lista.reduce((s, l) => s + Number(l.valor), 0);

  const LinhaRevisao = ({ l, pendente }: { l: (typeof lista)[number]; pendente: boolean }) => (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm text-text-primary">
          {l.descricao}
          {l.parcela_atual && l.parcela_total && (
            <span className="ml-1.5 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] text-text-faint">
              parcela {l.parcela_atual}/{l.parcela_total}
            </span>
          )}
          {l.transacao_id && (
            <span className="ml-1.5 rounded-full bg-bank-positivo-bg px-1.5 py-0.5 text-[10px] text-bank-positivo">
              lançado
            </span>
          )}
        </p>
        <p className="text-xs text-text-faint">
          {dataBR(l.data)} · {moedaBRL(Number(l.valor))}
          {!pendente && ` · ${nomeCategoria.get(l.categoria_id) ?? "categoria"}`}
          {l.categorizado_automaticamente && " · automático"}
        </p>
      </div>
      {!l.transacao_id && (
        <form action={categorizarLancamento} className="flex shrink-0 items-center gap-2">
          <input type="hidden" name="lancamento_id" value={l.id} />
          <input type="hidden" name="importacao_id" value={importacao.id} />
          <input type="hidden" name="descricao" value={l.descricao} />
          <select
            name="categoria_id"
            defaultValue={l.categoria_id ?? ""}
            className="rounded-[8px] border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none"
          >
            <option value="">Categoria —</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-[11px] text-text-faint">
            <input type="checkbox" name="criar_regra" className="h-3.5 w-3.5" /> regra
          </label>
          <button
            type="submit"
            className="rounded-[8px] border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            ok
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">
          Revisar fatura — {fatura.cartao?.nome ?? "cartão"} · {mesBR(String(fatura.competencia))}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {importacao.nome_arquivo} · {lista.length} lançamentos · {moedaBRL(total)} ·{" "}
          <span className={pendentes.length > 0 ? "text-bank-negativo" : "text-bank-positivo"}>
            {pendentes.length} sem categoria
          </span>
        </p>
      </div>

      {pendentes.length > 0 && (
        <section className="card-bank p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-bank-negativo">
            Precisam de categoria ({pendentes.length})
          </h2>
          <div className="mt-1 divide-y divide-border">
            {pendentes.map((l) => (
              <LinhaRevisao key={l.id} l={l} pendente />
            ))}
          </div>
        </section>
      )}

      <section className="card-bank p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Categorizados ({categorizados.length})</h2>
        <div className="mt-1 divide-y divide-border">
          {categorizados.map((l) => (
            <LinhaRevisao key={l.id} l={l} pendente={false} />
          ))}
        </div>
      </section>

      <form action={confirmarImportacao} className="sticky bottom-20 md:bottom-4">
        <input type="hidden" name="importacao_id" value={importacao.id} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-bank-primaria px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          <IconCheck size={18} stroke={2.2} />
          Confirmar e lançar {categorizados.filter((l) => !l.transacao_id).length} no extrato
        </button>
      </form>
      {pendentes.length > 0 && (
        <p className="-mt-2 text-center text-xs text-text-faint">
          Dá pra confirmar já: os sem categoria ficam aqui esperando você voltar.
        </p>
      )}
    </div>
  );
}
