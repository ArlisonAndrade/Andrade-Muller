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
  transferencia: boolean;
  obs: string | null;
};

type Opcao = { id: string; nome: string };

function valorMetodo(item: { cartao_id: string | null; metodo: string | null }) {
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
        <option value="">Grupo</option>
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
      <label className="col-span-2 flex items-center gap-1.5 text-xs text-text-secondary sm:col-span-2">
        <input
          type="checkbox"
          name="transferencia"
          defaultChecked={defaults.transferencia ?? false}
          className="rounded border-border"
        />
        precisa transferir
      </label>
      <input
        name="obs"
        defaultValue={defaults.obs ?? ""}
        placeholder="Obs (opcional)"
        className="col-span-2 rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none sm:col-span-3"
      />
    </>
  );
}

export function LinhaItem({
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
          {[item.categoriaNome, metodoLabel, item.transferencia ? "a transferir" : null, item.obs]
            .filter(Boolean)
            .join(" · ") || "—"}
        </span>
      </span>
      <span className="shrink-0 text-sm font-medium text-text-primary">
        {moedaBRL(Number(item.valor))}
      </span>
    </button>
  );
}

export function FormAdicionarItem({
  entidadeId,
  pessoas,
  categorias,
  cartoes,
  defaultsIniciais,
}: {
  entidadeId: string;
  pessoas: Opcao[];
  categorias: Opcao[];
  cartoes: Opcao[];
  defaultsIniciais?: Partial<ItemView>;
}) {
  const [adicionando, setAdicionando] = useState(false);

  if (!adicionando) {
    return (
      <button
        type="button"
        onClick={() => setAdicionando(true)}
        className="mt-1 rounded-[8px] border border-dashed border-border px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary"
      >
        + Adicionar item
      </button>
    );
  }

  return (
    <form
      action={criarOrcamentoItem}
      className="grid grid-cols-2 gap-2 rounded-[10px] bg-surface-2 p-3 sm:grid-cols-12"
    >
      <input type="hidden" name="entidade_id" value={entidadeId} />
      <CamposItem defaults={defaultsIniciais ?? {}} pessoas={pessoas} categorias={categorias} cartoes={cartoes} />
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
  );
}
