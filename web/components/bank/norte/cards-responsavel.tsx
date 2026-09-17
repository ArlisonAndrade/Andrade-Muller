"use client";

import { useState } from "react";
import { LinhaItem, FormAdicionarItem, type ItemView } from "@/components/bank/norte/tabela-divisao";
import { IconArrowsExchange } from "@/components/bank/ui/icones";
import { ValorMoeda } from "@/components/bank/norte/privacidade";
import { ROTULO_GRUPO, type GrupoOrcamento, type Pessoa } from "@/lib/bank/tipos";

type Opcao = { id: string; nome: string };

const COR_PADRAO = ["#2563eb", "#db2777", "#0d9488", "#f59e0b"];

// Ordem e acento de cada grupo — os grupos que o Planejamento já usa.
const GRUPOS: Array<{ chave: GrupoOrcamento | "sem_grupo"; rotulo: string; cor: string; emoji: string }> = [
  { chave: "liberdade_30", rotulo: ROTULO_GRUPO.liberdade_30, cor: "#6366f1", emoji: "🏠" },
  { chave: "essencial_50", rotulo: ROTULO_GRUPO.essencial_50, cor: "#f59e0b", emoji: "🛒" },
  { chave: "investimento_20", rotulo: ROTULO_GRUPO.investimento_20, cor: "#16a34a", emoji: "🌱" },
  { chave: "nao_aplica", rotulo: ROTULO_GRUPO.nao_aplica, cor: "#94a3b8", emoji: "•" },
  { chave: "sem_grupo", rotulo: "Sem grupo", cor: "#94a3b8", emoji: "•" },
];

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Divisão dos pagamentos (reformulada em 17/set/2026, a pedido do Arlison):
// dois cards de pessoa no topo que funcionam como filtro — clicar destaca o que
// aquela pessoa paga e apaga o resto — e, embaixo, as despesas em caixinhas
// agrupadas por Despesa Fixa / Variável / Investimento. Transferência tem
// borda tracejada e barra listrada no card, pra ficar nítido o dinheiro que
// passa pela mão do outro. Clicar na caixinha edita a despesa.
export function CardsResponsavel({
  entidadeId,
  pessoas,
  itens,
  categorias,
  cartoes,
  rendaPorPessoa,
}: {
  entidadeId: string;
  pessoas: Pessoa[];
  itens: ItemView[];
  categorias: Opcao[];
  cartoes: Opcao[];
  /** Renda do mês salva no Planejamento (a mesma do resto do Bank), por pessoa. */
  rendaPorPessoa: Record<string, number>;
}) {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const opcoesPessoas = pessoas.map((p) => ({ id: p.id, nome: p.nome }));
  const corDe = (id: string | null) => {
    const i = pessoas.findIndex((p) => p.id === id);
    return i < 0 ? "#94a3b8" : (pessoas[i].cor ?? COR_PADRAO[i % COR_PADRAO.length]);
  };

  const transferePara = (p: Pessoa) => pessoas.find((o) => o.id !== p.id);

  return (
    <section className="card-bank p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Divisão dos pagamentos</h2>
        <p className="text-xs text-text-faint">
          {selecionada ? "Clique de novo no card pra ver todos" : "Clique numa pessoa pra destacar o que ela paga"}
        </p>
      </div>

      {/* Pessoas: filtro */}
      <div className="grid gap-3 sm:grid-cols-2">
        {pessoas.map((p) => {
          const cor = corDe(p.id);
          const dela = itens.filter((i) => i.responsavel_id === p.id);
          const direto = dela.filter((i) => !i.transferencia).reduce((s, i) => s + Number(i.valor), 0);
          const transfere = dela.filter((i) => i.transferencia).reduce((s, i) => s + Number(i.valor), 0);
          const recebeDeOutros = itens
            .filter((i) => i.transferencia && i.responsavel_id && i.responsavel_id !== p.id)
            .reduce((s, i) => s + Number(i.valor), 0);
          const renda = rendaPorPessoa[p.id] ?? Number(p.renda_base);
          const paga = direto + transfere;
          const pct = renda > 0 ? (paga / renda) * 100 : 0;
          const escala = Math.max(renda, paga, 1);
          const ativa = selecionada === p.id;
          const destino = transferePara(p);

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelecionada(ativa ? null : p.id)}
              className={`flex flex-col gap-3 rounded-[14px] bg-surface-1 p-4 text-left transition-all duration-200 sm:p-5 ${
                selecionada && !ativa ? "opacity-60" : ""
              }`}
              style={{
                border: ativa ? `2px solid ${cor}` : "1px solid var(--color-border)",
                boxShadow: ativa ? `0 0 0 4px ${cor}22` : undefined,
              }}
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                  style={{ background: cor }}
                >
                  {iniciais(p.nome)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-text-primary">{p.nome}</span>
                  <span className="block text-xs text-text-faint">
                    recebe <ValorMoeda valor={renda} />
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={
                    pct > 100
                      ? { background: "var(--color-bank-negativo-bg)", color: "var(--color-bank-negativo)" }
                      : { background: `${cor}1f`, color: cor }
                  }
                >
                  {pct.toFixed(0)}% da renda
                </span>
              </span>

              {/* barra: cheio = paga direto, listrado = transfere */}
              <span className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
                <span style={{ width: `${(direto / escala) * 100}%`, background: cor }} />
                <span
                  style={{
                    width: `${(transfere / escala) * 100}%`,
                    background: `repeating-linear-gradient(45deg, ${cor} 0 6px, ${cor}55 6px 12px)`,
                  }}
                />
              </span>

              <span className="grid grid-cols-2 gap-2 text-sm">
                <span>
                  <span className="block text-xs text-text-faint">paga direto</span>
                  <span className="font-semibold text-text-primary">
                    <ValorMoeda valor={direto} />
                  </span>
                </span>
                {transfere > 0 ? (
                  <span className="text-right">
                    <span className="flex items-center justify-end gap-1 text-xs text-text-faint">
                      <IconArrowsExchange size={13} stroke={1.8} /> transfere{destino ? ` pro ${destino.nome}` : ""}
                    </span>
                    <span className="font-semibold" style={{ color: cor }}>
                      <ValorMoeda valor={transfere} />
                    </span>
                  </span>
                ) : recebeDeOutros > 0 ? (
                  <span className="text-right">
                    <span className="flex items-center justify-end gap-1 text-xs text-text-faint">
                      <IconArrowsExchange size={13} stroke={1.8} /> recebe de transferência
                    </span>
                    <span className="font-semibold text-bank-positivo">
                      <ValorMoeda valor={recebeDeOutros} />
                    </span>
                  </span>
                ) : (
                  <span />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grupos com caixinhas */}
      <div className="mt-6 flex flex-col gap-6">
        {GRUPOS.map((g) => {
          const doGrupo = itens
            .filter((i) => (i.grupo_orcamento ?? "sem_grupo") === g.chave)
            .sort((a, b) => Number(b.valor) - Number(a.valor));
          if (doGrupo.length === 0 && (g.chave === "nao_aplica" || g.chave === "sem_grupo")) return null;
          const total = doGrupo.reduce((s, i) => s + Number(i.valor), 0);
          const totalSelecionada = selecionada
            ? doGrupo.filter((i) => i.responsavel_id === selecionada).reduce((s, i) => s + Number(i.valor), 0)
            : null;

          return (
            <div key={g.chave}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] text-base"
                  style={{ background: `${g.cor}1f` }}
                  aria-hidden
                >
                  {g.emoji}
                </span>
                <h3 className="text-sm font-semibold text-text-primary">{g.rotulo}</h3>
                <span className="text-xs text-text-faint">· {doGrupo.length} itens</span>
                <span className="ml-auto text-sm font-semibold text-text-primary numeros-tabulares">
                  {totalSelecionada != null && (
                    <span className="mr-1 font-normal text-text-faint">
                      <ValorMoeda valor={totalSelecionada} /> de
                    </span>
                  )}
                  <ValorMoeda valor={total} />
                </span>
              </div>
              <div className="h-1 w-full rounded-full" style={{ background: `${g.cor}33` }} />
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {doGrupo.map((i) => (
                  <LinhaItem
                    key={i.id}
                    item={i}
                    pessoas={opcoesPessoas}
                    categorias={categorias}
                    cartoes={cartoes}
                    caixinha={{
                      cor: corDe(i.responsavel_id),
                      apagada: !!selecionada && i.responsavel_id !== selecionada,
                      destacada: !!selecionada && i.responsavel_id === selecionada,
                    }}
                  />
                ))}
                <FormAdicionarItem
                  entidadeId={entidadeId}
                  pessoas={opcoesPessoas}
                  categorias={categorias}
                  cartoes={cartoes}
                  comoCaixinha
                  defaultsIniciais={{
                    grupo_orcamento: g.chave === "sem_grupo" ? null : g.chave,
                    responsavel_id: selecionada,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
