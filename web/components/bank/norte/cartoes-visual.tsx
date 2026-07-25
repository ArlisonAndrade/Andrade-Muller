"use client";

import { useState } from "react";
import { LinhaItem, FormAdicionarItem, type ItemView } from "@/components/bank/norte/tabela-divisao";
import { ValorMoeda } from "@/components/bank/norte/privacidade";
import type { Cartao } from "@/lib/bank/tipos";

type Opcao = { id: string; nome: string };

const ESTILO_BANDEIRA: Record<string, { fundo: string; texto: string; marca: string }> = {
  nubank: { fundo: "linear-gradient(135deg, #820AD1 0%, #4e0680 100%)", texto: "#ffffff", marca: "nu" },
  carrefour: { fundo: "linear-gradient(135deg, #004E9E 0%, #00263f 100%)", texto: "#ffffff", marca: "Carrefour" },
};

export function CartoesVisual({
  entidadeId,
  cartoes,
  itens,
  pessoas,
  categorias,
}: {
  entidadeId: string;
  cartoes: Cartao[];
  itens: ItemView[];
  pessoas: Opcao[];
  categorias: Opcao[];
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const cartoesComItens = cartoes.filter((c) => itens.some((i) => i.cartao_id === c.id));
  const opcoesCartoes = cartoes.map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <section className="card-bank p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold">Cartões</h2>
      {cartoesComItens.length === 0 && (
        <p className="text-sm text-text-faint">Nenhum pagamento em cartão ainda.</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {cartoesComItens.map((c) => {
          const itensCartao = itens.filter((i) => i.cartao_id === c.id);
          const total = itensCartao.reduce((s, i) => s + i.valor, 0);
          const estilo =
            ESTILO_BANDEIRA[c.bandeira ?? ""] ??
            { fundo: "linear-gradient(135deg, #334155 0%, #0f172a 100%)", texto: "#ffffff", marca: c.nome };
          const expandido = aberto === c.id;

          return (
            <div key={c.id} className="mx-auto flex w-full max-w-[170px] flex-col gap-2">
              <button
                type="button"
                onClick={() => setAberto(expandido ? null : c.id)}
                className="flex aspect-[1.586/1] flex-col justify-between rounded-[10px] p-3 text-left shadow-md transition-transform hover:-translate-y-0.5"
                style={{ background: estilo.fundo, color: estilo.texto }}
              >
                <span className="text-sm font-semibold italic tracking-tight">{estilo.marca}</span>
                <div>
                  <p className="text-[9px] uppercase tracking-wide opacity-75">{c.titular ?? "—"}</p>
                  <p className="mt-0.5 text-xs font-semibold">
                    <ValorMoeda valor={total} />
                  </p>
                  <p className="text-[8px] opacity-70">fatura planejada</p>
                </div>
              </button>
              {expandido && (
                <div className="flex flex-col gap-1.5 rounded-[10px] border border-border p-3">
                  {itensCartao.map((i) => (
                    <LinhaItem
                      key={i.id}
                      item={i}
                      pessoas={pessoas}
                      categorias={categorias}
                      cartoes={opcoesCartoes}
                    />
                  ))}
                  <FormAdicionarItem
                    entidadeId={entidadeId}
                    pessoas={pessoas}
                    categorias={categorias}
                    cartoes={opcoesCartoes}
                    defaultsIniciais={{ cartao_id: c.id, metodo: "Cartão" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
