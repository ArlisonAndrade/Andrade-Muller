"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  importarTransacoes,
  type TransacaoImportada,
} from "@/lib/acoes/faturamento";
import { moedaBRL, dataBR } from "@/lib/formato";

interface ClienteOpcao {
  id: string;
  empresa: string | null;
  nome_contato: string;
}

interface Transacao {
  fitid: string;
  data: string; // "2026-04-07"
  valor: number;
  memo: string;
  clienteId: string; // "" = sem correspondência
  competencia: string; // "2026-04"
  jaImportada: boolean;
  selecionada: boolean;
}

const IGNORAR = new Set(["LTDA", "PIX", "RECEBIDA", "TRANSFERENCIA", "AGENCIA", "CONTA", "BCO"]);

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

// Casa o MEMO do extrato com um cliente pelo nº de palavras do nome presentes no texto
function sugerirCliente(memo: string, clientes: ClienteOpcao[]): string {
  const memoNorm = normalizar(memo);
  let melhor = "";
  let melhorPontos = 0;
  for (const c of clientes) {
    const palavras = normalizar(`${c.empresa ?? ""} ${c.nome_contato}`)
      .split(/[^A-Z0-9]+/)
      .filter((p) => p.length >= 3 && !IGNORAR.has(p));
    const pontos = palavras.filter((p) => memoNorm.includes(p)).length;
    if (pontos > melhorPontos) {
      melhorPontos = pontos;
      melhor = c.id;
    }
  }
  return melhor;
}

function analisarOfx(
  conteudo: string,
  clientes: ClienteOpcao[],
  fitidsImportados: Set<string>,
): Transacao[] {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) ?? [];
  const campo = (bloco: string, tag: string) =>
    bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`))?.[1]?.trim() ?? "";

  return blocos
    .filter((b) => campo(b, "TRNTYPE").toUpperCase().includes("CREDIT"))
    .map((b) => {
      const bruto = campo(b, "DTPOSTED"); // "20260407000000[-3:BRT]"
      const data = `${bruto.slice(0, 4)}-${bruto.slice(4, 6)}-${bruto.slice(6, 8)}`;
      const fitid = campo(b, "FITID");
      const memo = campo(b, "MEMO");
      const jaImportada = fitidsImportados.has(fitid);
      const clienteId = sugerirCliente(memo, clientes);
      return {
        fitid,
        data,
        valor: Number(campo(b, "TRNAMT")) || 0,
        memo,
        clienteId,
        competencia: data.slice(0, 7),
        jaImportada,
        selecionada: !jaImportada && clienteId !== "",
      };
    });
}

export function ImportadorOfx({
  clientes,
  fitidsImportados,
}: {
  clientes: ClienteOpcao[];
  fitidsImportados: string[];
}) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [gravando, startTransition] = useTransition();
  const router = useRouter();

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    setResultado(null);
    const conteudo = await arquivo.text();
    setTransacoes(
      analisarOfx(conteudo, clientes, new Set(fitidsImportados)),
    );
  }

  function atualizar(i: number, mudanca: Partial<Transacao>) {
    setTransacoes((atual) =>
      atual.map((t, idx) => (idx === i ? { ...t, ...mudanca } : t)),
    );
  }

  const selecionadas = transacoes.filter(
    (t) => t.selecionada && !t.jaImportada && t.clienteId,
  );

  function importar() {
    const itens: TransacaoImportada[] = selecionadas.map((t) => ({
      cliente_id: t.clienteId,
      valor: t.valor,
      competencia: t.competencia,
      data_emissao: t.data,
      fitid: t.fitid,
      arquivo: nomeArquivo,
    }));
    startTransition(async () => {
      const r = await importarTransacoes(itens);
      setResultado(
        `${r.inseridos} lançamento(s) importado(s)` +
          (r.pulados > 0 ? `, ${r.pulados} já existia(m)` : "") +
          ".",
      );
      router.refresh();
    });
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-faint">
          Arquivo .ofx do extrato (só as entradas/créditos são consideradas)
        </span>
        <input
          type="file"
          accept=".ofx"
          onChange={aoEscolherArquivo}
          className="w-full cursor-pointer rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-marinho file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-card"
        />
      </label>

      {transacoes.length > 0 && (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-2"></th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">Origem (extrato)</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2">Competência</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t, i) => (
                  <tr
                    key={t.fitid}
                    className={`border-b border-divider/60 align-top ${t.jaImportada ? "opacity-45" : ""}`}
                  >
                    <td className="py-2.5 pr-2">
                      <input
                        type="checkbox"
                        checked={t.selecionada && !t.jaImportada}
                        disabled={t.jaImportada}
                        onChange={(e) =>
                          atualizar(i, { selecionada: e.target.checked })
                        }
                        className="accent-marinho"
                      />
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-ink-soft">
                      {dataBR(t.data)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 font-display font-semibold text-salvia">
                      {moedaBRL(t.valor)}
                    </td>
                    <td className="max-w-72 py-2.5 pr-3 text-xs text-ink-faint">
                      {t.memo}
                      {t.jaImportada && (
                        <span className="ml-1 font-medium text-bronze">
                          · já importada
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <select
                        value={t.clienteId}
                        disabled={t.jaImportada}
                        onChange={(e) =>
                          atualizar(i, {
                            clienteId: e.target.value,
                            selecionada: e.target.value !== "",
                          })
                        }
                        className="w-44 rounded-md border border-divider bg-card px-2 py-1 text-xs text-ink"
                      >
                        <option value="">— não importar —</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.empresa ?? c.nome_contato}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5">
                      <input
                        type="month"
                        value={t.competencia}
                        disabled={t.jaImportada}
                        onChange={(e) =>
                          atualizar(i, { competencia: e.target.value })
                        }
                        className="rounded-md border border-divider bg-card px-2 py-1 text-xs text-ink"
                      />
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
