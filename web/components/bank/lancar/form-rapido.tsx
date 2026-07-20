"use client";

import { useMemo, useRef, useState } from "react";
import { criarLancamento } from "@/lib/bank/acoes/lancamento";
import type { FormaPagamento } from "@/lib/bank/tipos";
import {
  IconShoppingCart,
  IconToolsKitchen2,
  IconPackage,
  IconPill,
  IconGasStation,
  IconBeach,
  IconDeviceTv,
  IconDots,
  IconWallet,
  IconCheck,
  IconCash,
} from "@/components/bank/ui/icones";

type CategoriaOpcao = {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  grupo_orcamento: string | null;
};
type Opcao = { id: string; nome: string };
type TransacaoRecente = {
  forma_pagamento: string | null;
  cartao_id: string | null;
  categoria_id: string | null;
};

// Ícone por categoria (match por nome — categorias novas caem no padrão).
const ICONES_CATEGORIA: Array<[RegExp, typeof IconWallet]> = [
  [/mercado/i, IconShoppingCart],
  [/jantar|food|aliment/i, IconToolsKitchen2],
  [/commerce|compra/i, IconPackage],
  [/farm[aá]cia|sa[uú]de/i, IconPill],
  [/combust|transporte|abastec/i, IconGasStation],
  [/lazer/i, IconBeach],
  [/assinatura/i, IconDeviceTv],
  [/outro/i, IconDots],
];

function iconeDe(nome: string) {
  for (const [padrao, Icone] of ICONES_CATEGORIA) {
    if (padrao.test(nome)) return Icone;
  }
  return IconWallet;
}

const FORMAS: Array<{ valor: FormaPagamento; rotulo: string }> = [
  { valor: "credito", rotulo: "Crédito" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "outro", rotulo: "Outro" },
];

export function FormRapido({
  entidadeId,
  categorias,
  cartoes,
  contas,
  recentes,
  salvo,
}: {
  entidadeId: string;
  categorias: CategoriaOpcao[];
  cartoes: Opcao[];
  contas: Opcao[];
  recentes: TransacaoRecente[];
  salvo: boolean;
}) {
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [valor, setValor] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [maisDetalhes, setMaisDetalhes] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);

  // Forma e cartão mais recentes vêm pré-selecionados — o caminho feliz é
  // digitar o valor, tocar na categoria e salvar.
  const formaInicial = (recentes[0]?.forma_pagamento as FormaPagamento) || "credito";
  const cartaoInicial =
    recentes.find((r) => r.cartao_id)?.cartao_id ?? cartoes[0]?.id ?? null;
  const [forma, setForma] = useState<FormaPagamento>(formaInicial);
  const [cartaoId, setCartaoId] = useState<string | null>(cartaoInicial);

  // Categorias do tipo ativo, com as mais usadas recentemente primeiro.
  const categoriasVisiveis = useMemo(() => {
    const doTipo = categorias.filter((c) => c.tipo === tipo);
    const usoRecente = new Map<string, number>();
    recentes.forEach((r, i) => {
      if (r.categoria_id && !usoRecente.has(r.categoria_id)) {
        usoRecente.set(r.categoria_id, i);
      }
    });
    return [...doTipo].sort(
      (a, b) => (usoRecente.get(a.id) ?? 99) - (usoRecente.get(b.id) ?? 99),
    );
  }, [categorias, tipo, recentes]);

  const valorNumerico = Number(valor.replace(/\./g, "").replace(",", "."));
  const pronto = valorNumerico > 0 && categoriaId !== null;

  return (
    <form action={criarLancamento} className="flex flex-col gap-5">
      <input type="hidden" name="entidade_id" value={entidadeId} />
      <input type="hidden" name="valor" value={pronto ? valorNumerico : ""} />
      <input type="hidden" name="categoria_id" value={categoriaId ?? ""} />
      <input type="hidden" name="forma_pagamento" value={forma} />
      <input type="hidden" name="cartao_id" value={forma === "credito" ? (cartaoId ?? "") : ""} />

      {salvo && (
        <p className="flex items-center gap-2 rounded-[10px] bg-bank-positivo-bg px-3 py-2 text-sm font-medium text-bank-positivo">
          <IconCheck size={16} stroke={2.5} /> Lançado! Pode registrar o próximo.
        </p>
      )}

      {/* Despesa × Receita */}
      <div className="flex rounded-full bg-surface-3 p-1">
        {(["despesa", "receita"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTipo(t);
              setCategoriaId(null);
            }}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium capitalize transition-colors ${
              tipo === t ? "bg-surface-1 text-text-primary shadow-sm" : "text-text-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Valor gigante */}
      <label className="card-bank flex items-center gap-2 px-4 py-4">
        <span className="text-lg text-text-faint">R$</span>
        <input
          ref={valorRef}
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
          className="w-full bg-transparent text-3xl font-semibold text-text-primary outline-none placeholder:text-text-faint"
          aria-label="Valor"
        />
      </label>

      {/* Categorias em grid de botões grandes */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-faint">
          Categoria
        </p>
        <div className="grid grid-cols-4 gap-2">
          {categoriasVisiveis.map((c) => {
            const Icone = iconeDe(c.nome);
            const ativa = categoriaId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoriaId(ativa ? null : c.id)}
                className={`flex flex-col items-center gap-1 rounded-[10px] border px-1 py-2.5 text-center transition-colors ${
                  ativa
                    ? "border-bank-primaria bg-bank-primaria-bg text-bank-primaria"
                    : "border-border bg-surface-1 text-text-secondary"
                }`}
              >
                <Icone size={22} stroke={1.7} />
                <span className="w-full truncate text-[11px] leading-tight">{c.nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Forma de pagamento */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-faint">
          Forma de pagamento
        </p>
        <div className="flex flex-wrap gap-2">
          {FORMAS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setForma(f.valor)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                forma === f.valor
                  ? "border-bank-primaria bg-bank-primaria-bg font-medium text-bank-primaria"
                  : "border-border bg-surface-1 text-text-secondary"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        {forma === "credito" && cartoes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {cartoes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCartaoId(c.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                  cartaoId === c.id
                    ? "border-text-primary bg-text-primary font-medium text-surface-1"
                    : "border-border bg-surface-1 text-text-secondary"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detalhes opcionais (descrição, data, conta) */}
      <button
        type="button"
        onClick={() => setMaisDetalhes((v) => !v)}
        className="self-start text-xs text-bank-primaria underline"
      >
        {maisDetalhes ? "Esconder detalhes" : "+ Descrição, data ou conta"}
      </button>
      <div className={maisDetalhes ? "flex flex-col gap-3" : "hidden"}>
        <input
          name="descricao"
          type="text"
          placeholder="Descrição (opcional)"
          className="card-bank px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint"
        />
        <div className="flex gap-3">
          <input
            name="data"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="card-bank flex-1 px-3 py-2.5 text-sm text-text-primary outline-none"
          />
          {contas.length > 0 && (
            <select
              name="conta_id"
              defaultValue=""
              className="card-bank flex-1 px-3 py-2.5 text-sm text-text-primary outline-none"
            >
              <option value="">Conta —</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {/* Descrição vazia vira o nome da categoria no server. */}
      <input
        type="hidden"
        name="descricao_padrao"
        value={categoriasVisiveis.find((c) => c.id === categoriaId)?.nome ?? "Lançamento"}
      />

      {/* Ações */}
      <div className="flex gap-3">
        <button
          type="submit"
          name="acao"
          value="salvar_outro"
          disabled={!pronto}
          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-bank-primaria px-4 py-3 text-sm font-medium text-bank-primaria transition-opacity disabled:opacity-40"
        >
          <IconCash size={18} stroke={1.8} /> Salvar e lançar outro
        </button>
        <button
          type="submit"
          name="acao"
          value="salvar"
          disabled={!pronto}
          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-bank-primaria px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          <IconCheck size={18} stroke={2.2} /> Salvar
        </button>
      </div>
    </form>
  );
}
