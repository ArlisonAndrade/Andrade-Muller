"use client";

import { useState } from "react";
import { BadgeVariacao } from "@/components/bank/ui/badge-variacao";
import { IconChevronDown } from "@/components/bank/ui/icones";
import { atualizarValorAtivo } from "@/lib/bank/acoes/investimentos";
import { temCotacaoAutomatica } from "@/lib/bank/classes-ativos";
import type { ClasseResumo } from "@/lib/bank/calculos-investimentos";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Linha expansível de classe de ativo — a estrutura do "Meus Ativos" do
// Investidor10: resumo na linha, tabela de ativos ao abrir.
export function LinhaClasse({
  resumo,
  rotulo,
  cor,
  classe,
}: {
  resumo: ClasseResumo;
  rotulo: string;
  cor: string;
  classe: string;
}) {
  const [aberta, setAberta] = useState(false);
  const acimaDaMeta =
    resumo.percentualAlvo != null && resumo.percentualCarteira > resumo.percentualAlvo;

  return (
    <div className="card-bank overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ background: cor }}
        >
          {rotulo.charAt(0)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
          {rotulo}
        </span>

        <span className="hidden text-right sm:block">
          <span className="block text-xs text-text-faint">Ativos</span>
          <span className="text-sm font-medium">{resumo.quantidadeAtivos}</span>
        </span>
        <span className="w-28 text-right sm:w-32">
          <span className="block text-xs text-text-faint">Valor total</span>
          <span className="text-sm font-medium">{brl(resumo.valorMercado)}</span>
        </span>
        <span className="hidden w-24 text-right md:block">
          <span className="block text-xs text-text-faint">Variação</span>
          {resumo.variacaoDiaPct != null ? (
            <BadgeVariacao percentual={resumo.variacaoDiaPct} />
          ) : (
            <span className="text-sm text-text-faint">—</span>
          )}
        </span>
        <span className="hidden w-28 text-right md:block">
          <span className="block text-xs text-text-faint">Rentabilidade</span>
          {resumo.rentabilidadePct != null ? (
            <BadgeVariacao percentual={resumo.rentabilidadePct} />
          ) : (
            <span className="text-sm text-text-faint">—</span>
          )}
        </span>
        <span className="w-20 text-right sm:w-24">
          <span className="block text-xs text-text-faint">% na carteira</span>
          <span className="text-sm font-medium">
            {resumo.percentualCarteira.toFixed(0)}%
            {resumo.percentualAlvo != null && (
              <span className={acimaDaMeta ? "text-bank-negativo" : "text-text-faint"}>
                {" "}
                / {Number(resumo.percentualAlvo).toFixed(0)}%
              </span>
            )}
          </span>
        </span>
        <IconChevronDown
          size={18}
          stroke={1.8}
          className={`shrink-0 text-text-faint transition-transform ${aberta ? "rotate-180" : ""}`}
        />
      </button>

      {aberta && (
        <div className="border-t border-border px-4 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint">
                <th className="py-2 font-medium">Ativo</th>
                <th className="py-2 text-right font-medium">Qtd.</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Preço médio</th>
                <th className="py-2 text-right font-medium">Preço atual</th>
                <th className="py-2 text-right font-medium">Posição</th>
                <th className="hidden py-2 text-right font-medium md:table-cell">Rentab.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resumo.ativos.map((a) => (
                <tr key={a.ativo_id}>
                  <td className="py-2.5 font-medium">{a.ticker}</td>
                  <td className="py-2.5 text-right text-text-secondary">
                    {a.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}
                  </td>
                  <td className="hidden py-2.5 text-right text-text-secondary sm:table-cell">
                    {brl(a.precoMedio)}
                  </td>
                  <td className="py-2.5 text-right text-text-secondary">
                    {temCotacaoAutomatica(classe) ? (
                      brl(a.precoAtual)
                    ) : (
                      // Classes sem cotação automática: edição manual inline.
                      <form action={atualizarValorAtivo} className="inline-flex items-center gap-1">
                        <input type="hidden" name="ativo_id" value={a.ativo_id} />
                        <input
                          name="preco_atual"
                          type="number"
                          step="0.0001"
                          defaultValue={a.precoAtual.toFixed(2)}
                          className="w-24 rounded-[6px] border border-border bg-surface-2 px-2 py-1 text-right text-xs outline-none"
                          aria-label={`Preço atual de ${a.ticker}`}
                        />
                        <button
                          type="submit"
                          className="rounded-[6px] border border-border px-1.5 py-1 text-[10px] text-text-secondary hover:text-text-primary"
                        >
                          ok
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-medium">{brl(a.valorMercado)}</td>
                  <td className="hidden py-2.5 text-right md:table-cell">
                    {a.rentabilidadePct != null ? (
                      <BadgeVariacao percentual={a.rentabilidadePct} />
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
