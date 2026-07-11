"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analisarReuniao,
  confirmarAnalise,
  type AnaliseProposta,
} from "@/lib/acoes/analise";

export function AnaliseIa({
  reuniaoId,
  clienteId,
  clienteNome,
  projetoId,
  tituloReuniao,
  dataReuniao,
}: {
  reuniaoId: string;
  clienteId: string;
  clienteNome: string;
  projetoId: string | null;
  tituloReuniao: string;
  dataReuniao: string;
}) {
  const [texto, setTexto] = useState("");
  const [proposta, setProposta] = useState<AnaliseProposta | null>(null);
  const [selecionadas, setSelecionadas] = useState<boolean[]>([]);
  const [incluirProxima, setIncluirProxima] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [analisando, startAnalise] = useTransition();
  const [confirmando, startConfirmacao] = useTransition();
  const router = useRouter();

  function analisar() {
    setErro(null);
    startAnalise(async () => {
      try {
        const resultado = await analisarReuniao({
          clienteNome,
          tituloReuniao,
          dataReuniao,
          texto,
        });
        setProposta(resultado);
        setSelecionadas(resultado.acoes.map(() => true));
        setIncluirProxima(resultado.proxima_reuniao !== null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao analisar.");
      }
    });
  }

  function atualizarAcao(i: number, campo: "prazo" | "responsavel", valor: string) {
    setProposta((p) =>
      p
        ? {
            ...p,
            acoes: p.acoes.map((a, idx) =>
              idx === i ? { ...a, [campo]: campo === "prazo" && !valor ? null : valor } : a,
            ),
          }
        : p,
    );
  }

  function confirmar() {
    if (!proposta) return;
    setErro(null);
    startConfirmacao(async () => {
      try {
        await confirmarAnalise({
          reuniaoId,
          clienteId,
          projetoId,
          textoOriginal: texto,
          analise: {
            resumo_executivo: proposta.resumo_executivo,
            decisoes_tomadas: proposta.decisoes_tomadas,
            proximos_passos: proposta.proximos_passos,
            relatorio_analise: proposta.relatorio_analise,
          },
          acoes: proposta.acoes.filter((_, i) => selecionadas[i]),
          proximaReuniao: incluirProxima ? proposta.proxima_reuniao : null,
        });
        setSucesso(true);
        setProposta(null);
        setTexto("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao confirmar.");
      }
    });
  }

  if (sucesso) {
    return (
      <p className="text-sm font-medium text-salvia">
        ✓ Ata gravada, tarefas criadas e agenda atualizada. Recarregando…
      </p>
    );
  }

  if (!proposta) {
    return (
      <div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={7}
          placeholder="Cole aqui a transcrição da reunião ou o seu resumo (qualquer formato serve) — a IA monta a ata, extrai as tarefas com prazos e agenda a próxima reunião pra você revisar."
          className="w-full rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink outline-none focus:border-bronze"
        />
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={analisar}
            disabled={analisando || texto.trim().length < 40}
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90 disabled:opacity-40"
          >
            {analisando ? "Analisando… (leva ~1 min)" : "Analisar com IA"}
          </button>
          {erro && <p className="text-sm text-terracota">{erro}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Resumo executivo
        </h3>
        <p className="text-sm text-ink">{proposta.resumo_executivo}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Decisões tomadas
          </h3>
          <ul className="list-inside list-disc text-sm text-ink-soft">
            {proposta.decisoes_tomadas.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Próximos passos
          </h3>
          <ul className="list-inside list-disc text-sm text-ink-soft">
            {proposta.proximos_passos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Ações → tarefas (desmarque o que não quiser criar)
        </h3>
        <div className="flex flex-col gap-1.5">
          {proposta.acoes.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-parchment/60 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={selecionadas[i] ?? false}
                onChange={(e) =>
                  setSelecionadas((s) => s.map((v, idx) => (idx === i ? e.target.checked : v)))
                }
                className="h-4 w-4 shrink-0 accent-salvia"
              />
              <span className={`flex-1 text-sm ${selecionadas[i] ? "text-ink" : "text-ink-faint line-through"}`}>
                {a.titulo}
              </span>
              <input
                value={a.responsavel}
                onChange={(e) => atualizarAcao(i, "responsavel", e.target.value)}
                className="w-24 rounded-md border border-divider bg-card px-2 py-1 text-xs text-ink-soft"
              />
              <input
                type="date"
                value={a.prazo ?? ""}
                onChange={(e) => atualizarAcao(i, "prazo", e.target.value)}
                className="rounded-md border border-divider bg-card px-2 py-1 text-xs text-ink-soft"
              />
              <span className="w-14 text-right text-[11px] font-medium text-bronze">
                {a.prioridade}
              </span>
            </div>
          ))}
          {proposta.acoes.length === 0 && (
            <p className="text-sm text-ink-faint">Nenhuma ação acionável identificada.</p>
          )}
        </div>
      </div>

      {proposta.proxima_reuniao && (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={incluirProxima}
            onChange={(e) => setIncluirProxima(e.target.checked)}
            className="h-4 w-4 accent-salvia"
          />
          Agendar próxima reunião: <strong>{proposta.proxima_reuniao.titulo}</strong>{" "}
          <span className="text-ink-faint">
            ({proposta.proxima_reuniao.data_hora.replace("T", " às ")})
          </span>
        </label>
      )}

      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Análise consultiva
        </h3>
        <p className="whitespace-pre-line text-sm text-ink-soft">
          {proposta.relatorio_analise}
        </p>
      </div>

      <div className="flex items-center gap-4 border-t border-divider pt-3">
        <button
          type="button"
          onClick={confirmar}
          disabled={confirmando}
          className="rounded-lg bg-salvia px-5 py-2 text-sm font-medium text-card hover:opacity-90 disabled:opacity-40"
        >
          {confirmando
            ? "Gravando…"
            : `Confirmar tudo (${selecionadas.filter(Boolean).length} tarefas)`}
        </button>
        <button
          type="button"
          onClick={() => setProposta(null)}
          className="text-sm text-ink-faint hover:text-ink"
        >
          Descartar e refazer
        </button>
        {erro && <p className="text-sm text-terracota">{erro}</p>}
      </div>
    </div>
  );
}
