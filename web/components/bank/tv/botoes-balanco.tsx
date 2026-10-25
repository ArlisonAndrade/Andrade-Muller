"use client";

import { useState } from "react";

// Capa do Modo TV: o Balanço Patrimonial Trimestral em PDF (pedido do Arlison,
// 25/out/2026). "Ver" abre o PDF para conferir; "Enviar" manda no grupo pelo
// Arkad — o mesmo arquivo, porque o parecer fica guardado na primeira geração.

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function BotoesBalanco({ trimestre, sigla, enviadoEm }: { trimestre: string; sigla: string; enviadoEm: string | null }) {
  const [estado, setEstado] = useState<"parado" | "enviando" | "ok" | "erro">("parado");
  const [ultimoEnvio, setUltimoEnvio] = useState(enviadoEm);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    const pergunta = ultimoEnvio
      ? `O balanço do ${sigla} já foi enviado em ${quando(ultimoEnvio)}. Mandar de novo no grupo?`
      : `Mandar o Balanço Patrimonial do ${sigla} no grupo da família?`;
    if (!window.confirm(pergunta)) return;
    setEstado("enviando");
    setErro(null);
    try {
      const resposta = await fetch("/api/bank/balanco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: trimestre }),
      });
      const corpo = (await resposta.json()) as { ok?: boolean; erro?: string; enviadoEm?: string };
      if (!resposta.ok || !corpo.ok) throw new Error(corpo.erro ?? `erro ${resposta.status}`);
      setUltimoEnvio(corpo.enviadoEm ?? new Date().toISOString());
      setEstado("ok");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "não deu para enviar");
      setEstado("erro");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-base">
        <a
          href={`/api/bank/balanco?t=${trimestre}`}
          target="_blank"
          rel="noopener"
          className="rounded-full border border-white/30 px-4 py-2 text-white/90 hover:bg-white/10"
        >
          📄 Ver o balanço em PDF
        </a>
        <button
          type="button"
          onClick={enviar}
          disabled={estado === "enviando"}
          className="rounded-full border border-white/30 px-4 py-2 text-white/90 hover:bg-white/10 disabled:opacity-60"
        >
          {estado === "enviando" ? "Gerando e enviando…" : "✈️ Enviar no grupo"}
        </button>
      </div>
      <p className="text-sm text-white/60">
        {estado === "ok"
          ? "Enviado no grupo pelo Arkad."
          : estado === "erro"
            ? `Não foi: ${erro}`
            : ultimoEnvio
              ? `Último envio no grupo: ${quando(ultimoEnvio)}`
              : "A primeira geração leva alguns segundos: o Arkad escreve o parecer."}
      </p>
    </div>
  );
}
