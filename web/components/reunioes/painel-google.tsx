"use client";

import { useState, useTransition } from "react";
import {
  sincronizarComGoogle,
  desconectarGoogle,
} from "@/lib/acoes/google";

const MENSAGENS_STATUS: Record<string, { texto: string; erro: boolean }> = {
  conectado: { texto: "Google Agenda conectado.", erro: false },
  negado: { texto: "Você recusou a autorização no Google.", erro: true },
  estado_invalido: {
    texto: "Sessão de autorização inválida — tente conectar de novo.",
    erro: true,
  },
  sem_refresh: {
    texto:
      "O Google não devolveu o token de renovação. Remova o acesso do app na sua conta Google e conecte de novo.",
    erro: true,
  },
  falha: { texto: "Falha ao conectar com o Google.", erro: true },
  nao_configurado: {
    texto: "Faltam as credenciais do Google no servidor (GOOGLE_CLIENT_ID etc.).",
    erro: true,
  },
};

export function PainelGoogle({
  configurado,
  conectado,
  email,
  status,
}: {
  configurado: boolean;
  conectado: boolean;
  email: string | null;
  status?: string;
}) {
  const [pendente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<string | null>(null);
  const msg = status ? MENSAGENS_STATUS[status] : null;

  function sincronizar() {
    setResultado(null);
    startTransition(async () => {
      const r = await sincronizarComGoogle();
      setResultado(
        r.erro
          ? `Erro: ${r.erro}`
          : `${r.criadas} criada(s), ${r.atualizadas} atualizada(s), ${r.canceladas} cancelada(s).`,
      );
    });
  }

  function desconectar() {
    startTransition(async () => {
      await desconectarGoogle();
      setResultado(null);
    });
  }

  return (
    <div className="rounded-card bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-medium text-ink">
            Sincronização com o Google Agenda
          </h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            {conectado
              ? `Conectado como ${email ?? "conta Google"}. Reuniões criadas aqui viram eventos na agenda.`
              : "Conecte para espelhar suas reuniões no Google Agenda (celular incluído)."}
          </p>
        </div>

        {!configurado ? (
          <span className="rounded-lg bg-parchment px-3 py-1.5 text-xs text-ink-faint">
            Não configurado no servidor
          </span>
        ) : conectado ? (
          <div className="flex gap-2">
            <button
              onClick={sincronizar}
              disabled={pendente}
              className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90 disabled:opacity-50"
            >
              {pendente ? "Sincronizando…" : "Sincronizar do Google"}
            </button>
            <button
              onClick={desconectar}
              disabled={pendente}
              className="rounded-lg border border-divider px-4 py-2 text-sm font-medium text-ink-soft hover:text-terracota disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <a
            href="/api/google/connect"
            className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Conectar Google Agenda
          </a>
        )}
      </div>

      {msg && (
        <p
          className={`mt-3 text-xs ${msg.erro ? "text-terracota" : "text-salvia"}`}
        >
          {msg.texto}
        </p>
      )}
      {resultado && (
        <p className="mt-3 text-xs text-ink-soft">{resultado}</p>
      )}
    </div>
  );
}
