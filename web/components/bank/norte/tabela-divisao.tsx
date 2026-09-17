"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROTULO_GRUPO, type GrupoOrcamento } from "@/lib/bank/tipos";
import {
  criarOrcamentoItem,
  editarOrcamentoItem,
  excluirOrcamentoItem,
} from "@/lib/bank/acoes/norte";
import { IconeDespesa } from "@/lib/bank/icone-despesa";
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
  logoDominio?: string | null;
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
      <label className={rotulo}>
        Site da empresa, pra mostrar a logo (opcional)
        <input
          name="logo_dominio"
          defaultValue={defaults.logoDominio ?? ""}
          placeholder="netflix.com"
          className={campo}
        />
      </label>
    </div>
  );
}

/** Aparência de caixinha na divisão por grupo (17/set/2026). */
export type CaixinhaVisual = {
  cor: string; // cor de quem paga
  apagada: boolean; // outra pessoa está selecionada
  destacada: boolean; // a pessoa dona está selecionada
};

export function LinhaItem({
  item,
  pessoas,
  categorias,
  cartoes,
  caixinha,
}: {
  item: ItemView;
  pessoas: Opcao[];
  categorias: Opcao[];
  cartoes: Opcao[];
  caixinha?: CaixinhaVisual;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const metodoLabel = item.cartao_id ? item.cartaoNome : item.metodo;

  // Precisa aguardar o server action antes de fechar a edição — senão o
  // estado local fica preso e o form não reflete o novo valor salvo.
  async function salvar(formData: FormData) {
    setSalvando(true);
    try {
      await editarOrcamentoItem(formData);
      // Ver a nota em renda-familia.tsx: sem refresh a lista fica velha.
      router.refresh();
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {caixinha ? (
        // Caixinha: faixa na cor de quem paga; transferência com borda
        // tracejada e etiqueta própria, pra ficar nítido o que passa pela mão
        // do outro. Clicar abre a mesma edição de sempre.
        <button
          type="button"
          onClick={() => setEditando(true)}
          title="Editar"
          className={`relative flex h-full w-full flex-col gap-2 rounded-[12px] bg-surface-1 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            caixinha.apagada ? "opacity-30" : "opacity-100"
          }`}
          style={{
            border: item.transferencia ? `2px dashed ${caixinha.cor}` : "1px solid var(--color-border)",
            boxShadow: `inset 4px 0 0 ${caixinha.cor}${caixinha.destacada ? `, 0 0 0 3px ${caixinha.cor}33` : ""}`,
          }}
        >
          <span className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ background: `${caixinha.cor}1f`, color: caixinha.cor }}
            >
              <IconeDespesa
                item={item.item}
                categoria={item.categoriaNome}
                logoDominio={item.logoDominio}
                size={18}
                tamanhoLogo={36}
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{item.item}</span>
          </span>
          <span className="text-lg font-semibold text-text-primary numeros-tabulares">
            <ValorMoeda valor={Number(item.valor)} />
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className="rounded-full px-2 py-0.5 font-medium"
              style={{ background: `${caixinha.cor}1f`, color: caixinha.cor }}
            >
              {item.transferencia ? `⇄ ${item.responsavelNome ?? ""} transfere` : (item.responsavelNome ?? "Sem responsável")}
            </span>
            {item.categoriaNome && <span className="truncate text-text-faint">{item.categoriaNome}</span>}
          </span>
        </button>
      ) : (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left hover:bg-surface-2"
        title="Editar"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-text-secondary">
          <IconeDespesa item={item.item} categoria={item.categoriaNome} logoDominio={item.logoDominio} tamanhoLogo={36} />
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
      )}

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
  comoCaixinha = false,
}: {
  entidadeId: string;
  pessoas: Opcao[];
  categorias: Opcao[];
  cartoes: Opcao[];
  defaultsIniciais?: Partial<ItemView>;
  /** Na grade de caixinhas, o botão vira uma caixinha tracejada "+ item". */
  comoCaixinha?: boolean;
}) {
  const router = useRouter();
  const [adicionando, setAdicionando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(formData: FormData) {
    setSalvando(true);
    try {
      await criarOrcamentoItem(formData);
      // Ver a nota em renda-familia.tsx: sem refresh a lista fica velha.
      router.refresh();
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
        className={
          comoCaixinha
            ? "flex h-full min-h-[112px] w-full items-center justify-center rounded-[12px] border-2 border-dashed border-border text-sm text-text-faint transition-colors hover:border-bank-primaria hover:text-bank-primaria"
            : "mt-1 w-full rounded-[8px] border border-dashed border-border px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary"
        }
      >
        {comoCaixinha ? "+ item" : "+ Adicionar item"}
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
