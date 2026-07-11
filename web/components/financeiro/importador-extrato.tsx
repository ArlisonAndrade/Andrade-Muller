"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importarExtrato, type ItemExtrato } from "@/lib/acoes/financeiro";
import { moedaBRL, dataBR } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";

interface Linha {
  fitid: string;
  data: string;
  valor: number; // positivo
  entrada: boolean;
  memo: string;
  categoriaId: string;
  jaImportada: boolean;
  selecionada: boolean;
}

function sugerirCategoria(
  memo: string,
  entrada: boolean,
  categorias: Categoria[],
): string {
  const m = memo.toUpperCase();
  const achar = (tipo: "receita" | "despesa", termo: string) =>
    categorias.find((c) => c.tipo === tipo && c.nome.toUpperCase().includes(termo))?.id;

  if (entrada) {
    return (
      achar("receita", "HONOR") ??
      categorias.find((c) => c.tipo === "receita")?.id ??
      ""
    );
  }
  if (/(DAS|SIMPLES|DARF|DCTF|INSS|TRIBUT)/.test(m))
    return achar("despesa", "DAS") ?? "";
  if (/(TARIFA|IOF|ANUIDADE)/.test(m)) return achar("despesa", "TARIFA") ?? "";
  if (/JUROS|MULTA/.test(m)) return achar("despesa", "JUROS") ?? "";
  if (/(PRO.?LABORE)/.test(m)) return achar("despesa", "LABORE") ?? "";
  if (/(CONTABIL)/.test(m)) return achar("despesa", "CONTABIL") ?? "";
  if (/(CHATGPT|OPENAI|CANVA|NOTION|ANTHROPIC|CLAUDE|GOOGLE|ZOOM)/.test(m))
    return achar("despesa", "ASSINATURAS") ?? "";
  return (
    achar("despesa", "OUTRAS DESPESAS VARI") ??
    categorias.find((c) => c.tipo === "despesa")?.id ??
    ""
  );
}

function analisarOfx(
  conteudo: string,
  categorias: Categoria[],
  fitidsImportados: Set<string>,
): Linha[] {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) ?? [];
  const campo = (bloco: string, tag: string) =>
    bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`))?.[1]?.trim() ?? "";

  return blocos
    .map((b) => {
      const bruto = campo(b, "DTPOSTED");
      const data = `${bruto.slice(0, 4)}-${bruto.slice(4, 6)}-${bruto.slice(6, 8)}`;
      const valorBruto = Number(campo(b, "TRNAMT")) || 0;
      const entrada = valorBruto >= 0;
      const fitid = campo(b, "FITID");
      const memo = campo(b, "MEMO") || campo(b, "NAME") || "(sem descrição)";
      const jaImportada = fitidsImportados.has(fitid);
      return {
        fitid,
        data,
        valor: Math.abs(valorBruto),
        entrada,
        memo,
        categoriaId: sugerirCategoria(memo, entrada, categorias),
        jaImportada,
        selecionada: !jaImportada,
      };
    })
    .filter((l) => l.valor > 0);
}

export function ImportadorExtrato({
  categorias,
  fitidsImportados,
}: {
  categorias: Categoria[];
  fitidsImportados: string[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [resultado, setResultado] = useState<string | null>(null);
  const [gravando, startTransition] = useTransition();
  const router = useRouter();

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setResultado(null);
    const conteudo = await arquivo.text();
    setLinhas(analisarOfx(conteudo, categorias, new Set(fitidsImportados)));
  }

  function atualizar(i: number, mudanca: Partial<Linha>) {
    setLinhas((atual) =>
      atual.map((l, idx) => (idx === i ? { ...l, ...mudanca } : l)),
    );
  }

  const selecionadas = linhas.filter(
    (l) => l.selecionada && !l.jaImportada && l.categoriaId,
  );

  function importar() {
    const itens: ItemExtrato[] = selecionadas.map((l) => ({
      fitid: l.fitid,
      data: l.data,
      valor: l.valor,
      descricao: l.memo,
      categoria_id: l.categoriaId,
    }));
    startTransition(async () => {
      const r = await importarExtrato(itens);
      setResultado(
        `${r.inseridos} lançamento(s) importado(s)` +
          (r.pulados > 0 ? `, ${r.pulados} já existia(m)` : "") +
          ".",
      );
      router.refresh();
    });
  }

  const totalEntradas = linhas
    .filter((l) => l.entrada)
    .reduce((s, l) => s + l.valor, 0);
  const totalSaidas = linhas
    .filter((l) => !l.entrada)
    .reduce((s, l) => s + l.valor, 0);

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-faint">
          Arquivo .ofx do extrato — entradas e saídas viram lançamentos de
          caixa categorizados
        </span>
        <input
          type="file"
          accept=".ofx"
          onChange={aoEscolherArquivo}
          className="w-full cursor-pointer rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-marinho file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-card"
        />
      </label>

      {linhas.length > 0 && (
        <>
          <p className="mt-3 text-xs text-ink-faint">
            {linhas.length} transações ·{" "}
            <span className="text-salvia">entradas {moedaBRL(totalEntradas)}</span>{" "}
            ·{" "}
            <span className="text-terracota">saídas {moedaBRL(totalSaidas)}</span>
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-2"></th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">Descrição (extrato)</th>
                  <th className="py-2">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr
                    key={l.fitid}
                    className={`border-b border-divider/60 align-top ${l.jaImportada ? "opacity-45" : ""}`}
                  >
                    <td className="py-2.5 pr-2">
                      <input
                        type="checkbox"
                        checked={l.selecionada && !l.jaImportada}
                        disabled={l.jaImportada}
                        onChange={(e) =>
                          atualizar(i, { selecionada: e.target.checked })
                        }
                        className="accent-marinho"
                      />
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-ink-soft">
                      {dataBR(l.data)}
                    </td>
                    <td
                      className={`whitespace-nowrap py-2.5 pr-3 font-display font-semibold ${
                        l.entrada ? "text-salvia" : "text-terracota"
                      }`}
                    >
                      {l.entrada ? "+" : "−"} {moedaBRL(l.valor)}
                    </td>
                    <td className="max-w-80 py-2.5 pr-3 text-xs text-ink-faint">
                      {l.memo}
                      {l.jaImportada && (
                        <span className="ml-1 font-medium text-bronze">
                          · já importada
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <select
                        value={l.categoriaId}
                        disabled={l.jaImportada}
                        onChange={(e) =>
                          atualizar(i, { categoriaId: e.target.value })
                        }
                        className="w-52 rounded-md border border-divider bg-card px-2 py-1 text-xs text-ink"
                      >
                        {categorias
                          .filter((c) => c.tipo === (l.entrada ? "receita" : "despesa"))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={importar}
              disabled={gravando || selecionadas.length === 0}
              className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90 disabled:opacity-40"
            >
              {gravando
                ? "Importando…"
                : `Importar ${selecionadas.length} selecionada(s)`}
            </button>
            {resultado && (
              <p className="text-sm font-medium text-salvia">{resultado}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
