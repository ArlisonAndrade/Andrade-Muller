import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA, type FormaPagamento } from "@/lib/bank/tipos";
import { moedaBRL, mesBR } from "@/lib/bank/formato";
import {
  gerarRecorrenciasPendentes,
  criarRecorrencia,
  alternarRecorrencia,
} from "@/lib/bank/acoes/recorrencias";

export const metadata = { title: "Extrato" };

const ROTULO_FORMA: Record<FormaPagamento, string> = {
  debito: "Débito",
  credito: "Crédito",
  pix: "Pix",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

function limitesDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  const inicio = `${mes}-01`;
  const fimExclusivo =
    m === 12 ? `${ano + 1}-01-01` : `${ano}-${String(m + 1).padStart(2, "0")}-01`;
  return { inicio, fimExclusivo };
}

function mesVizinho(mes: string, delta: number) {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Extrato mensal da Família + gestão de assinaturas/recorrências.
export default async function PaginaLancamentos({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  // Garante as transações das recorrências do mês antes de listar.
  await gerarRecorrenciasPendentes();

  const { mes: mesParam } = await searchParams;
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? (mesParam as string) : mesAtual;
  const { inicio, fimExclusivo } = limitesDoMes(mes);

  const supabase = await createClient();
  const [{ data: transacoes }, { data: recorrencias }, { data: categorias }, { data: cartoes }] =
    await Promise.all([
      supabase
        .from("transacoes")
        .select(
          "id, descricao, valor, data, forma_pagamento, cartao_id, recorrencia_id, categoria:categorias(nome, tipo, grupo_orcamento)",
        )
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .gte("data", inicio)
        .lt("data", fimExclusivo)
        .order("data", { ascending: false })
        .order("id", { ascending: false }),
      supabase
        .from("recorrencias")
        .select("id, descricao, valor, dia_do_mes, ativa, forma_pagamento, categoria:categorias(nome)")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("dia_do_mes"),
      supabase
        .from("categorias")
        .select("id, nome, tipo")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
      supabase.from("cartoes").select("id, nome").eq("entidade_id", ENTIDADE_FAMILIA).order("nome"),
    ]);

  type TransacaoExtrato = {
    id: string;
    descricao: string;
    valor: number;
    data: string;
    forma_pagamento: FormaPagamento | null;
    cartao_id: string | null;
    recorrencia_id: string | null;
    categoria: { nome: string; tipo: string; grupo_orcamento: string | null } | null;
  };
  type RecorrenciaLista = {
    id: string;
    descricao: string;
    valor: number;
    dia_do_mes: number;
    ativa: boolean;
    forma_pagamento: FormaPagamento | null;
    categoria: { nome: string } | null;
  };
  // O client sem types gerados infere o join como array — na prática o FK
  // singular devolve objeto único.
  const lista = (transacoes ?? []) as unknown as TransacaoExtrato[];
  const listaRecorrencias = (recorrencias ?? []) as unknown as RecorrenciaLista[];
  const receitas = lista
    .filter((t) => t.categoria?.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  const despesas = lista
    .filter((t) => t.categoria?.tipo !== "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  const saldo = receitas - despesas;

  // Agrupa por dia pra leitura rápida.
  const porDia = new Map<string, TransacaoExtrato[]>();
  for (const t of lista) {
    const grupo = porDia.get(t.data) ?? [];
    grupo.push(t);
    porDia.set(t.data, grupo);
  }

  const nomeCartao = new Map((cartoes ?? []).map((c) => [c.id, c.nome]));

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho com navegação de mês */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold capitalize">{mesBR(`${mes}-01`)}</h1>
        <div className="flex gap-2">
          <Link
            href={`/bank/lancamentos?mes=${mesVizinho(mes, -1)}`}
            className="rounded-[8px] border border-border bg-surface-1 px-3 py-1.5 text-sm text-text-secondary"
          >
            ←
          </Link>
          <Link
            href={`/bank/lancamentos?mes=${mesVizinho(mes, 1)}`}
            className="rounded-[8px] border border-border bg-surface-1 px-3 py-1.5 text-sm text-text-secondary"
          >
            →
          </Link>
        </div>
      </div>

      {/* Totais do mês */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="card-bank p-3 sm:p-4">
          <p className="text-xs text-text-secondary">Receitas</p>
          <p className="mt-1 text-sm font-semibold text-bank-positivo sm:text-lg">
            {moedaBRL(receitas)}
          </p>
        </div>
        <div className="card-bank p-3 sm:p-4">
          <p className="text-xs text-text-secondary">Despesas</p>
          <p className="mt-1 text-sm font-semibold text-bank-negativo sm:text-lg">
            {moedaBRL(despesas)}
          </p>
        </div>
        <div className="card-bank p-3 sm:p-4">
          <p className="text-xs text-text-secondary">Saldo</p>
          <p
            className={`mt-1 text-sm font-semibold sm:text-lg ${
              saldo >= 0 ? "text-bank-positivo" : "text-bank-negativo"
            }`}
          >
            {moedaBRL(saldo)}
          </p>
        </div>
      </div>

      {/* Lista por dia */}
      <div className="card-bank divide-y divide-border">
        {lista.length === 0 && (
          <p className="p-6 text-sm text-text-faint">
            Nenhum lançamento neste mês.{" "}
            <Link href="/bank/lancar" className="text-bank-primaria underline">
              Lançar o primeiro
            </Link>
            .
          </p>
        )}
        {[...porDia.entries()].map(([data, itens]) => (
          <div key={data} className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-faint">
              {new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              })}
            </p>
            <div className="flex flex-col gap-2.5">
              {itens.map((t) => {
                const receita = t.categoria?.tipo === "receita";
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text-primary">
                        {t.descricao}
                        {t.recorrencia_id && (
                          <span className="ml-1.5 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] text-text-faint">
                            recorrente
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-faint">
                        {t.categoria?.nome ?? "Sem categoria"}
                        {t.forma_pagamento &&
                          ` · ${ROTULO_FORMA[t.forma_pagamento as FormaPagamento]}`}
                        {t.cartao_id && nomeCartao.has(t.cartao_id)
                          ? ` (${nomeCartao.get(t.cartao_id)})`
                          : ""}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-medium ${
                        receita ? "text-bank-positivo" : "text-text-primary"
                      }`}
                    >
                      {receita ? "+" : "−"} {moedaBRL(Number(t.valor))}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

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
