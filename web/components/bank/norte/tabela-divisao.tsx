"use client";

import { useState } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { ROTULO_GRUPO, type GrupoOrcamento } from "@/lib/bank/tipos";
import {
  criarOrcamentoItem,
  editarOrcamentoItem,
  excluirOrcamentoItem,
} from "@/lib/bank/acoes/norte";

const METODOS_SIMPLES = ["Débito Automático", "Débito", "PIX", "Boleto", "Dinheiro"];
const GRUPOS: GrupoOrcamento[] = [
  "essencial_50",
  "liberdade_30",
  "investimento_20",
  "nao_aplica",
];

export type ItemView = {
  id: string;
  item: string;
  valor: number;
  categoria_id: string | null;
  grupo_orcamento: GrupoOrcamento | null;
  metodo: string | null;
  cartao_id: string | null;
  cartaoNome: string | null;
  categoriaNome: string | null;
  responsavel_id: string | null;
  responsavelNome: string | null;
  obs: string | null;
};

type Opcao = { id: string; nome: string };

type Props = {
  entidadeId: string;
  itens: ItemView[];
  pessoas: Opcao[];
  categorias: Opcao[];
  cartoes: Opcao[];
};

function valorMetodo(item: Pick<ItemView, "cartao_id" | "metodo">) {
  if (item.cartao_id) return `cartao:${item.cartao_id}`;
  return item.metodo ?? "";
}

// Campos compartilhados entre "adicionar" e "editar".
function CamposItem({
  defaults,
  pessoas,
  categorias,
  cartoes,
}: {
  defaults: Partial<ItemView>;
  pessoas: Opcao[];
  categorias: Opcao[];
  cartoes: Opcao[];
}) {
  return (
    <>
      <input
        name="item"
        defaultValue={defaults.item ?? ""}
        required
        placeholder="Item (ex. Aluguel)"
        className="col-span-2 rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-3"
      />
      <input
        name="valor"
        type="number"
        step="0.01"
        min="0"
        defaultValue={defaults.valor ?? ""}
        required
        placeholder="Valor"
        className="rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-2"
      />
      <select
        name="categoria_id"
        defaultValue={defaults.categoria_id ?? ""}
        className="rounded-[8px] border border-border bg-surface-1 px-2 py-2 text-sm outline-none sm:col-span-2"
      >
        <option value="">Categoria</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      <select
        name="grupo_orcamento"
        defaultValue={defaults.grupo_orcamento ?? ""}
        className="rounded-[8px] border border-border bg-surface-1 px-2 py-2 text-sm outline-none sm:col-span-2"
      >
        <option value="">Grupo 50/30/20</option>
        {GRUPOS.map((g) => (
          <option key={g} value={g}>
            {ROTULO_GRUPO[g]}
          </option>
        ))}
      </select>
      <select
        name="metodo"
        defaultValue={valorMetodo({
          cartao_id: defaults.cartao_id ?? null,
          metodo: defaults.metodo ?? null,
        })}
        className="rounded-[8px] border border-border bg-surface-1 px-2 py-2 text-sm outline-none sm:col-span-2"
      >
        <option value="">Método</option>
        {METODOS_SIMPLES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        {cartoes.map((c) => (
          <option key={c.id} value={`cartao:${c.id}`}>
            {c.nome}
          </option>
        ))}
      </select>
      <select
        name="responsavel_id"
        defaultValue={defaults.responsavel_id ?? ""}
        className="rounded-[8px] border border-border bg-surface-1 px-2 py-2 text-sm outline-none sm:col-span-2"
      >
        <option value="">Responsável</option>
        {pessoas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <input
        name="obs"
        defaultValue={defaults.obs ?? ""}
        placeholder="Obs (opcional)"
        className="col-span-2 rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-3"
      />
    </>
  );
}

function Linha({
  item,
  pessoas,
  categorias,
  cartoes,
}: {
  item: ItemView;
  pessoas: Opcao[];
  categorias: Opcao[];
  cartoes: Opcao[];
}) {
  const [editando, setEditando] = useState(false);
  const metodoLabel = item.cartao_id ? item.cartaoNome : item.metodo;

  if (editando) {
    return (
      <form
        action={editarOrcamentoItem}
        className="grid grid-cols-2 gap-2 rounded-[10px] bg-surface-2 p-3 sm:grid-cols-12"
      >
        <input type="hidden" name="id" value={item.id} />
        <CamposItem defaults={item} pessoas={pessoas} categorias={categorias} cartoes={cartoes} />
        <div className="col-span-2 flex gap-2 sm:col-span-12">
          <button
            type="submit"
            className="rounded-[8px] bg-bank-primaria px-3 py-1.5 text-sm font-medium text-white"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-[8px] border border-border px-3 py-1.5 text-sm text-text-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            formAction={excluirOrcamentoItem}
            className="ml-auto rounded-[8px] border border-bank-negativo px-3 py-1.5 text-sm text-bank-negativo"
          >
            Excluir
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="flex w-full items-center justify-between gap-3 rounded-[8px] px-2 py-2 text-left hover:bg-surface-2"
      title="Editar"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-text-primary">{item.item}</span>
        <span className="block truncate text-xs text-text-faint">
          {[item.categoriaNome, metodoLabel, item.obs].filter(Boolean).join(" · ") || "—"}
        </span>
      </span>
      <span className="shrink-0 text-sm font-medium text-text-primary">
        {moedaBRL(Number(item.valor))}
      </span>
    </button>
  );
}

export function TabelaDivisao({ entidadeId, itens, pessoas, categorias, cartoes }: Props) {
  const [agrupamento, setAgrupamento] = useState<"responsavel" | "cartao">("responsavel");
  const [adicionando, setAdicionando] = useState(false);

  const nomePessoa = new Map(pessoas.map((p) => [p.id, p.nome]));
  const nomeCartao = new Map(cartoes.map((c) => [c.id, c.nome]));

  const chave = (i: ItemView) =>
    agrupamento === "responsavel"
      ? (i.responsavel_id ?? "sem")
      : (i.cartao_id ?? "sem");
  const rotuloGrupo = (k: string) => {
    if (k === "sem") return agrupamento === "responsavel" ? "Sem responsável" : "Sem cartão";
    return (agrupamento === "responsavel" ? nomePessoa.get(k) : nomeCartao.get(k)) ?? "—";
  };

  const grupos = new Map<string, ItemView[]>();
  for (const i of itens) {
    const k = chave(i);
    grupos.set(k, [...(grupos.get(k) ?? []), i]);
  }
  const total = itens.reduce((s, i) => s + Number(i.valor), 0);

  return (
    <section className="card-bank p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Divisão dos pagamentos</h2>
          <p className="text-xs text-text-faint">
            O que é pago todo mês — {moedaBRL(total)} no total
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {(["responsavel", "cartao"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setAgrupamento(op)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                agrupamento === op
                  ? "bg-text-primary text-surface-1"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {op === "responsavel" ? "Por responsável" : "Por cartão"}
            </button>
          ))}
        </div>
      </div>

      {itens.length === 0 && (
        <p className="py-6 text-center text-sm text-text-faint">
          Nenhum pagamento cadastrado ainda. Adicione o primeiro abaixo.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {[...grupos.entries()].map(([k, lista]) => {
          const subtotal = lista.reduce((s, i) => s + Number(i.valor), 0);
          return (
            <div key={k}>
              <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                  {rotuloGrupo(k)}
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  {moedaBRL(subtotal)}
                </span>
              </div>
              <div className="flex flex-col">
                {lista.map((i) => (
                  <Linha
                    key={i.id}
                    item={i}
                    pessoas={pessoas}
                    categorias={categorias}
                    cartoes={cartoes}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Adicionar item */}
      {adicionando ? (
        <form
          action={criarOrcamentoItem}
          className="mt-4 grid grid-cols-2 gap-2 rounded-[10px] bg-surface-2 p-3 sm:grid-cols-12"
        >
          <input type="hidden" name="entidade_id" value={entidadeId} />
          <CamposItem defaults={{}} pessoas={pessoas} categorias={categorias} cartoes={cartoes} />
          <div className="col-span-2 flex gap-2 sm:col-span-12">
            <button
              type="submit"
              className="rounded-[8px] bg-bank-primaria px-3 py-1.5 text-sm font-medium text-white"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setAdicionando(false)}
              className="rounded-[8px] border border-border px-3 py-1.5 text-sm text-text-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdicionando(true)}
          className="mt-4 rounded-[8px] border border-dashed border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
        >
          + Adicionar pagamento
        </button>
      )}
    </section>
  );
}
