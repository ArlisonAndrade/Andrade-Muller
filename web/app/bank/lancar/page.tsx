import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { moedaBRL } from "@/lib/bank/formato";
import { FormRapido } from "@/components/bank/lancar/form-rapido";
import { criarRecorrencia, alternarRecorrencia } from "@/lib/bank/acoes/recorrencias";

export const metadata = { title: "Lançar" };

// Lançamento rápido — a tela de todo dia, otimizada pro celular: valor,
// um toque na categoria, forma de pagamento e pronto. Entidade fixa na
// Família (Arthur e CNPJ têm fluxos próprios: investimentos e ponte).
export default async function PaginaLancar({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const supabase = await createClient();
  const { salvo } = await searchParams;

  const [{ data: categorias }, { data: cartoes }, { data: contas }, { data: recentes }, { data: recorrencias }] =
    await Promise.all([
      supabase
        .from("categorias")
        .select("id, nome, tipo, grupo_orcamento")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
      supabase
        .from("cartoes")
        .select("id, nome")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
      supabase
        .from("contas")
        .select("id, nome")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
      supabase
        .from("transacoes")
        .select("forma_pagamento, cartao_id, categoria_id")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .not("forma_pagamento", "is", null)
        .order("data", { ascending: false })
        .limit(10),
      supabase
        .from("recorrencias")
        .select("id, descricao, valor, dia_do_mes, ativa, categoria:categorias(nome)")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("dia_do_mes"),
    ]);

  type RecorrenciaLista = {
    id: string;
    descricao: string;
    valor: number;
    dia_do_mes: number;
    ativa: boolean;
    categoria: { nome: string } | null;
  };
  // O client sem types gerados infere o join como array — na prática o FK
  // singular devolve objeto único.
  const listaRecorrencias = (recorrencias ?? []) as unknown as RecorrenciaLista[];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <FormRapido
        entidadeId={ENTIDADE_FAMILIA}
        categorias={categorias ?? []}
        cartoes={cartoes ?? []}
        contas={contas ?? []}
        recentes={recentes ?? []}
        salvo={salvo === "1"}
      />

      {/* Assinaturas & recorrências */}
      <section className="card-bank p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Assinaturas & recorrências</h2>
        <p className="mt-1 text-xs text-text-faint">
          Todo mês, no dia marcado, o lançamento é criado sozinho — sem precisar lembrar.
        </p>

        {listaRecorrencias.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            {listaRecorrencias.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`truncate text-sm ${r.ativa ? "text-text-primary" : "text-text-faint line-through"}`}>
                    {r.descricao}
                  </p>
                  <p className="text-xs text-text-faint">
                    dia {r.dia_do_mes} · {r.categoria?.nome ?? "sem categoria"} ·{" "}
                    {moedaBRL(Number(r.valor))}
                  </p>
                </div>
                <form action={alternarRecorrencia}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="ativa" value={String(r.ativa)} />
                  <button
                    type="submit"
                    className={`rounded-full border px-3 py-1 text-xs ${
                      r.ativa
                        ? "border-border text-text-secondary"
                        : "border-bank-primaria text-bank-primaria"
                    }`}
                  >
                    {r.ativa ? "Pausar" : "Reativar"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Nova recorrência */}
        <form action={criarRecorrencia} className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <input type="hidden" name="entidade_id" value={ENTIDADE_FAMILIA} />
          <input
            name="descricao"
            required
            placeholder="Descrição (ex. Netflix)"
            className="col-span-2 rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-faint sm:col-span-2"
          />
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
            name="dia_do_mes"
            type="number"
            min="1"
            max="28"
            required
            placeholder="Dia"
            className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-faint"
          />
          <select
            name="categoria_id"
            className="rounded-[8px] border border-border bg-surface-2 px-2 py-2 text-sm outline-none"
            defaultValue=""
          >
            <option value="">Categoria —</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-[8px] bg-bank-primaria px-3 py-2 text-sm font-medium text-white"
          >
            Criar
          </button>
        </form>
      </section>
    </div>
  );
}
