"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { salvarRendaMes, salvarRendasDoMes } from "@/lib/bank/acoes/norte";
import { IconUser } from "@/components/bank/ui/icones";
import { ValorMoeda } from "@/components/bank/norte/privacidade";
import { tipoRendaDaPessoa, type Pessoa } from "@/lib/bank/tipos";
import type { RendaDoMes } from "@/lib/bank/renda";

function CardPessoa({
  pessoa,
  competencia,
  renda,
}: {
  pessoa: Pessoa;
  competencia: string;
  renda: RendaDoMes;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(formData: FormData) {
    setSalvando(true);
    setErro(null);
    try {
      await salvarRendaMes(formData);
      // O `action=` aqui é uma função cliente, não a server action direta —
      // então o React não atualiza o router sozinho e o revalidatePath do
      // servidor só marca a página como suja. Sem este refresh o valor era
      // gravado no banco e a tela continuava mostrando o número velho, que
      // pro usuário é indistinguível de "não salvou".
      router.refresh();
      setEditando(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <form
        action={salvar}
        className="flex flex-1 flex-col gap-2 rounded-[10px] border border-bank-primaria bg-surface-2 p-4"
      >
        <input type="hidden" name="entidade_id" value={pessoa.entidade_id} />
        <input type="hidden" name="competencia" value={competencia} />
        <input type="hidden" name="tipo" value={tipoRendaDaPessoa(pessoa.nome)} />
        <div className="flex items-center gap-2">
          <IconUser size={16} stroke={1.8} style={{ color: pessoa.cor ?? "var(--color-bank-primaria)" }} />
          <span className="text-sm font-medium text-text-primary">{pessoa.nome}</span>
        </div>
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0"
          autoFocus
          defaultValue={renda.valor}
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-lg font-semibold outline-none"
        />
        {erro && <p className="text-xs text-bank-negativo">{erro}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-[8px] bg-bank-primaria px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-[8px] border border-border px-3 py-1.5 text-xs text-text-secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      disabled={renda.confirmado}
      className="flex flex-1 flex-col gap-1 rounded-[10px] border border-border bg-surface-2 p-4 text-left transition-shadow enabled:hover:shadow-md disabled:cursor-default"
    >
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <IconUser size={16} stroke={1.8} style={{ color: pessoa.cor ?? "var(--color-bank-primaria)" }} />
        {pessoa.nome}
      </span>
      <span className="font-serif text-2xl font-medium text-text-primary">
        <ValorMoeda valor={renda.valor} />
      </span>
      <span className="text-[11px] text-text-faint">
        {renda.confirmado
          ? "recebido ✓"
          : renda.temLancamento
            ? "toque para editar"
            : "não salvo — toque para editar"}
      </span>
    </button>
  );
}

/**
 * Virada de mês: os salários ainda não foram salvos e a tela está mostrando os
 * valores repetidos do último mês salvo. Salvar confirma como está; Editar
 * abre os campos de todo mundo num formulário só.
 */
function ConfirmarSalarios({
  pessoas,
  competencia,
  rendaPorPessoa,
  rotuloMes,
  rotuloHerdado,
}: {
  pessoas: Pessoa[];
  competencia: string;
  rendaPorPessoa: Map<string, RendaDoMes>;
  rotuloMes: string;
  rotuloHerdado: string | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(formData: FormData) {
    setSalvando(true);
    setErro(null);
    try {
      await salvarRendasDoMes(formData);
      // Mesmo motivo do CardPessoa: action em função cliente não refaz o router.
      router.refresh();
      setEditando(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      action={salvar}
      className="mb-3 flex flex-col gap-3 rounded-[10px] border border-bank-primaria bg-bank-primaria-bg p-3 sm:p-4"
    >
      <input type="hidden" name="entidade_id" value={pessoas[0]?.entidade_id ?? ""} />
      <input type="hidden" name="competencia" value={competencia} />
      <p className="text-sm text-text-primary">
        <strong className="capitalize">Salários de {rotuloMes}</strong> ainda não foram salvos.{" "}
        <span className="text-text-secondary">
          {rotuloHerdado
            ? `Os valores abaixo repetem ${rotuloHerdado}.`
            : "Os valores abaixo são a renda base de cada um."}{" "}
          O cálculo do mês segue o que você salvar.
        </span>
      </p>

      {pessoas.map((p) => {
        const valor = rendaPorPessoa.get(p.id)?.valor ?? Number(p.renda_base);
        return editando ? (
          <label key={p.id} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-text-secondary">{p.nome}</span>
            <input type="hidden" name="tipo" value={tipoRendaDaPessoa(p.nome)} />
            <input
              name="valor"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valor}
              className="min-w-0 flex-1 rounded-[8px] border border-border bg-surface-1 px-3 py-2 font-semibold outline-none"
            />
          </label>
        ) : (
          <span key={p.id} hidden>
            <input type="hidden" name="tipo" value={tipoRendaDaPessoa(p.nome)} />
            <input type="hidden" name="valor" value={valor} />
          </span>
        );
      })}

      {erro && <p className="text-xs text-bank-negativo">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-[8px] bg-bank-primaria px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar salários"}
        </button>
        <button
          type="button"
          onClick={() => setEditando((e) => !e)}
          className="rounded-[8px] border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary"
        >
          {editando ? "Cancelar" : "Editar"}
        </button>
      </div>
    </form>
  );
}

export function RendaFamilia({
  pessoas,
  competencia,
  rendaPorPessoa,
  pendente,
  rotuloHerdado,
  mesAnteriorHref,
  mesProximoHref,
  rotuloMes,
}: {
  pessoas: Pessoa[];
  competencia: string;
  rendaPorPessoa: Map<string, RendaDoMes>;
  pendente: boolean;
  rotuloHerdado: string | null;
  mesAnteriorHref: string;
  mesProximoHref: string;
  rotuloMes: string;
}) {
  const total = pessoas.reduce((s, p) => s + (rendaPorPessoa.get(p.id)?.valor ?? 0), 0);

  return (
    <section className="card-bank p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Renda da família</h2>
        <div className="flex items-center gap-2 text-xs text-text-faint">
          <Link href={mesAnteriorHref} className="rounded-full border border-border px-2 py-1 hover:text-text-primary">
            ‹
          </Link>
          <span className="min-w-[88px] text-center capitalize text-text-secondary">{rotuloMes}</span>
          <Link href={mesProximoHref} className="rounded-full border border-border px-2 py-1 hover:text-text-primary">
            ›
          </Link>
        </div>
      </div>
      {pendente && (
        <ConfirmarSalarios
          key={competencia}
          pessoas={pessoas}
          competencia={competencia}
          rendaPorPessoa={rendaPorPessoa}
          rotuloMes={rotuloMes}
          rotuloHerdado={rotuloHerdado}
        />
      )}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          {pessoas.map((p) => (
            <CardPessoa
              key={p.id}
              pessoa={p}
              competencia={competencia}
              renda={
                rendaPorPessoa.get(p.id) ?? {
                  valor: Number(p.renda_base),
                  confirmado: false,
                  temLancamento: false,
                }
              }
            />
          ))}
        </div>
        <span className="hidden text-xl text-text-faint sm:block">=</span>
        <div className="flex flex-col items-center justify-center rounded-[10px] bg-bank-primaria-bg p-4 sm:w-44">
          <span className="text-xs text-text-secondary">Total do mês</span>
          <span className="font-serif text-2xl font-semibold text-bank-primaria">
            <ValorMoeda valor={total} />
          </span>
        </div>
      </div>
    </section>
  );
}
