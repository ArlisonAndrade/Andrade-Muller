"use client";

import { useState } from "react";
import { ROTULO_GRUPO, type GrupoOrcamento } from "@/lib/bank/tipos";
import {
  criarOrcamentoItem,
  editarOrcamentoItem,
  excluirOrcamentoItem,
} from "@/lib/bank/acoes/norte";
import { IconeCategoria } from "@/lib/bank/icone-categoria";
import { ValorMoeda } from "@/components/bank/norte/privacidade";
import { Modal } from "@/components/bank/ui/modal";

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

const campo = "rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-faint";
const rotulo = "flex flex-col gap-1 text-xs text-text-secondary";

// Campos compartilhados entre "adicionar" e "editar". Layout vertical,
// pensado pra caber com folga dentro do Modal (não da coluna estreita do
// card que abriu o formulário).
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
    <div className="flex flex-col gap-3">
      <label className={rotulo}>
        Item
        <input
          name="item"
          defaultValue={defaults.item ?? ""}
          required
          placeholder="ex. Aluguel"
          className={campo}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          Valor
          <input
            name="valor"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults.valor ?? ""}
            required
            placeholder="0,00"
            className={campo}
          />
        </label>
        <label className={rotulo}>
          Categoria
          <select name="categoria_id" defaultValue={defaults.categoria_id ?? ""} className={campo}>
            <option value="">—</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          Grupo
          <select name="grupo_orcamento" defaultValue={defaults.grupo_orcamento ?? ""} className={campo}>
            <option value="">—</option>
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {ROTULO_GRUPO[g]}
              </option>
            ))}
          </select>
        </label>
        <label className={rotulo}>
          Método
          <select
            name="metodo"
            defaultValue={valorMetodo({
              cartao_id: defaults.cartao_id ?? null,
              metodo: defaults.metodo ?? null,
            })}
            className={campo}
          >
            <option value="">—</option>
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
        </label>
      </div>

      <label className={rotulo}>
        Responsável
        <select name="responsavel_id" defaultValue={defaults.responsavel_id ?? ""} className={campo}>
          <option value="">—</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          name="transferencia"
          defaultChecked={defaults.transferencia ?? false}
          className="h-4 w-4 rounded border-border"
        />
        precisa transferir
      </label>

      <label className={rotulo}>
        Obs (opcional)
        <input
          name="obs"
          defaultValue={defaults.obs ?? ""}
          placeholder="opcional"
          className={campo}
        />
      </label>
    </div>
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
  const [salvando, setSalvando] = useState(false);
  const metodoLabel = item.cartao_id ? item.cartaoNome : item.metodo;

  // Precisa aguardar o server action antes de fechar a edição — senão o
  // estado local fica preso e o form não reflete o novo valor salvo.
  async function salvar(formData: FormData) {
    setSalvando(true);
    try {
      await editarOrcamentoItem(formData);
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left hover:bg-surface-2"
        title="Editar"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-text-secondary">
          <IconeCategoria categoria={item.categoriaNome} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-text-primary">{item.item}</span>
          <span className="block truncate text-xs text-text-faint">
            {[item.categoriaNome, metodoLabel, item.transferencia ? "a transferir" : null, item.obs]
              .filter(Boolean)
              .join(" · ") || "—"}
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium text-text-primary">
          <ValorMoeda valor={Number(item.valor)} />
        </span>
      </button>

      {editando && (
        <Modal titulo="Editar item" subtitulo={item.item} onFechar={() => setEditando(false)}>
          <form action={salvar} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={item.id} />
            <CamposItem defaults={item} pessoas={pessoas} categorias={categorias} cartoes={cartoes} />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-[8px] bg-bank-primaria px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="rounded-[8px] border border-border px-4 py-2 text-sm text-text-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                formAction={excluirOrcamentoItem}
                className="ml-auto rounded-[8px] border border-bank-negativo px-4 py-2 text-sm text-bank-negativo"
              >
                Excluir
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
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
  const [salvando, setSalvando] = useState(false);

  async function salvar(formData: FormData) {
    setSalvando(true);
    try {
      await criarOrcamentoItem(formData);
      setAdicionando(false);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAdicionando(true)}
        className="mt-1 w-full rounded-[8px] border border-dashed border-border px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary"
      >
        + Adicionar item
      </button>

      {adicionando && (
        <Modal titulo="Adicionar item" onFechar={() => setAdicionando(false)}>
          <form action={salvar} className="flex flex-col gap-4">
            <input type="hidden" name="entidade_id" value={entidadeId} />
            <CamposItem defaults={defaultsIniciais ?? {}} pessoas={pessoas} categorias={categorias} cartoes={cartoes} />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-[8px] bg-bank-primaria px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Adicionar"}
              </button>
              <button
                type="button"
                onClick={() => setAdicionando(false)}
                className="rounded-[8px] border border-border px-4 py-2 text-sm text-text-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
