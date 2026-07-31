"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@/components/bank/ui/icones";

// Ações de exclusão devolvem `{ erro }` em vez de estourar: o caso comum
// (conta que ainda tem lançamento) é uma recusa esperada, não um bug — o
// usuário precisa ler o porquê, não cair na tela de erro do Next.
export type AcaoExcluir = (formData: FormData) => Promise<{ erro?: string } | void>;

// Exclusão em dois toques: o primeiro abre a confirmação, o segundo apaga.
// Sem `window.confirm` (o mobile trata mal) e sem clique acidental — foi um
// clique repetido que criou três contratos Santander idênticos.
export function BotaoExcluir({
  acao,
  id,
  oQue,
  aviso,
  aoTerminarIrPara,
  rotulo,
  campos,
}: {
  acao: AcaoExcluir;
  id: string;
  /** Como o item é chamado na pergunta: "esta dívida", "a meta Reserva". */
  oQue: string;
  /** O que mais some junto, quando não é óbvio. */
  aviso?: string;
  /** Rota para onde ir depois — use quando a página atual deixa de existir. */
  aoTerminarIrPara?: string;
  /** Texto ao lado do ícone. Sem ele fica só o ícone (listas densas). */
  rotulo?: string;
  /** Campos extras no FormData — ex. entidade_id, quando o id não basta. */
  campos?: Record<string, string>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  function excluir() {
    const dados = new FormData();
    dados.set("id", id);
    for (const [chave, valor] of Object.entries(campos ?? {})) dados.set(chave, valor);
    iniciar(async () => {
      const resultado = await acao(dados);
      if (resultado?.erro) {
        setErro(resultado.erro);
        setConfirmando(false);
        return;
      }
      if (aoTerminarIrPara) router.push(aoTerminarIrPara);
    });
  }

  if (erro) {
    return (
      <div className="flex items-center gap-2 text-xs text-bank-negativo">
        <span>{erro}</span>
        <button
          type="button"
          onClick={() => setErro(null)}
          className="shrink-0 underline"
        >
          ok
        </button>
      </div>
    );
  }

  if (confirmando) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
        <span className="text-text-secondary">
          Excluir {oQue}?{aviso ? ` ${aviso}` : ""}
        </span>
        <button
          type="button"
          onClick={excluir}
          disabled={pendente}
          className="rounded-[6px] bg-bank-negativo px-2.5 py-1 font-medium text-white disabled:opacity-60"
        >
          {pendente ? "Excluindo…" : "Sim, excluir"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pendente}
          className="rounded-[6px] border border-border px-2.5 py-1 text-text-secondary"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      title={`Excluir ${oQue}`}
      aria-label={`Excluir ${oQue}`}
      className="flex shrink-0 items-center gap-1.5 rounded-[6px] border border-border px-2 py-1 text-xs text-text-faint hover:border-bank-negativo hover:text-bank-negativo"
    >
      <IconTrash size={14} stroke={1.8} />
      {rotulo}
    </button>
  );
}
