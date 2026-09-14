"use client";

import { useMemo, useState } from "react";
import { salvarParametrosPlano } from "@/lib/bank/acoes/planos";
import {
  CHAVES_PLANO,
  mesQueAlcanca,
  projetarMeses,
  rotuloMes,
  rotuloValor,
  somarMeses,
  type ParametrosPlano,
} from "@/lib/bank/plano";

const paraInputMes = (aaaamm: number) => `${Math.floor(aaaamm / 100)}-${String(aaaamm % 100).padStart(2, "0")}`;
const deInputMes = (v: string) => Number(v.slice(0, 4)) * 100 + Number(v.slice(5, 7));

// Os números que definem o plano. Tudo na página (fases, marcos, %, aporte do
// mês, score, jornada da home, Modo TV) sai daqui — mudou, recalcula.
//
// O form passa a server action direto no `action=` (e não embrulhada numa
// função cliente) de propósito: é o caminho em que o React refaz a página
// sozinho depois de salvar. Ver a armadilha anotada no CLAUDE.md.
export function ParametrosPlanoForm({
  entidadeId,
  parametros,
  patrimonioHoje,
  hoje,
}: {
  entidadeId: string;
  parametros: ParametrosPlano;
  patrimonioHoje: number;
  hoje: number;
}) {
  const [p, setP] = useState(parametros);
  const [recomecar, setRecomecar] = useState(false);
  const campo = <K extends keyof ParametrosPlano>(k: K, v: ParametrosPlano[K]) => setP((a) => ({ ...a, [k]: v }));

  const efetivo: ParametrosPlano = recomecar
    ? { ...p, inicio: somarMeses(hoje, 1), valorInicial: Math.round(patrimonioHoje * 100) / 100 }
    : p;

  const previa = useMemo(() => {
    const curva = projetarMeses(efetivo, patrimonioHoje, Math.max(hoje, efetivo.inicio), (efetivo.anoMeta + 20) * 100 + 12);
    return {
      mesMeta: mesQueAlcanca(curva, efetivo.metaFinal),
      mesMilhao: mesQueAlcanca(curva, 1_000_000),
    };
  }, [efetivo, patrimonioHoje, hoje]);

  const entrada = "w-full rounded-[8px] border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-bank-primaria";
  const rotulo = "flex flex-col gap-1 text-xs text-text-secondary";

  return (
    <form action={salvarParametrosPlano} className="flex flex-col gap-4">
      <input type="hidden" name="entidade_id" value={entidadeId} />
      <input type="hidden" name="caminho" value="/bank/plano" />
      {(Object.keys(CHAVES_PLANO) as (keyof ParametrosPlano)[]).map((k) => (
        <input key={k} type="hidden" name={`param_${CHAVES_PLANO[k]}`} value={efetivo[k]} />
      ))}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={rotulo}>
          Aporte no início (R$/mês)
          <input className={entrada} type="number" min={0} step={50} value={p.aporteInicial}
            onChange={(e) => campo("aporteInicial", Number(e.target.value))} />
        </label>
        <label className={rotulo}>
          Aporte-alvo (R$/mês)
          <input className={entrada} type="number" min={0} step={100} value={p.aporteAlvo}
            onChange={(e) => campo("aporteAlvo", Number(e.target.value))} />
        </label>
        <label className={rotulo}>
          Chegar no aporte-alvo em
          <input className={entrada} type="month" value={paraInputMes(p.rampaFim)}
            onChange={(e) => e.target.value && campo("rampaFim", deInputMes(e.target.value))} />
        </label>
        <label className={rotulo}>
          Reajuste do aporte depois disso (% a.a.)
          <input className={entrada} type="number" min={0} max={30} step={0.5} value={p.reajusteAa}
            onChange={(e) => campo("reajusteAa", Number(e.target.value))} />
        </label>
        <label className={rotulo}>
          Rentabilidade esperada (% a.a.)
          <input className={entrada} type="number" min={0} max={30} step={0.5} value={p.rentabilidadeAa}
            onChange={(e) => campo("rentabilidadeAa", Number(e.target.value))} />
        </label>
        <label className={rotulo}>
          Meta final (R$) e ano
          <span className="flex gap-2">
            <input className={entrada} type="number" min={100000} step={100000} value={p.metaFinal}
              onChange={(e) => campo("metaFinal", Number(e.target.value))} />
            <input className={`${entrada} max-w-24`} type="number" min={hoje / 100} max={2100} value={p.anoMeta}
              onChange={(e) => campo("anoMeta", Number(e.target.value))} />
          </span>
        </label>
      </div>

      <label className="flex items-start gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={recomecar} onChange={(e) => setRecomecar(e.target.checked)} className="mt-0.5" />
        <span>
          Recomeçar a linha de base: o plano passa a contar de {rotuloMes(somarMeses(hoje, 1))} com a carteira de hoje.
          Hoje ele conta de {rotuloMes(p.inicio)} com {rotuloValor(p.valorInicial)}. Use quando o plano mudar de verdade
          — não pra apagar um mês ruim.
        </span>
      </label>

      <div className="flex flex-col gap-3 rounded-[10px] bg-surface-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-text-secondary">
          Com esses números, no ritmo de hoje:{" "}
          <strong className="text-text-primary">R$ 1 milhão</strong> em{" "}
          <strong className="text-bank-primaria">{previa.mesMilhao ? rotuloMes(previa.mesMilhao) : "—"}</strong> ·{" "}
          <strong className="text-text-primary">{rotuloValor(efetivo.metaFinal)}</strong> em{" "}
          <strong className={previa.mesMeta && previa.mesMeta <= efetivo.anoMeta * 100 + 12 ? "text-bank-positivo" : "text-bank-negativo"}>
            {previa.mesMeta ? rotuloMes(previa.mesMeta) : "depois de 20 anos do prazo"}
          </strong>
        </p>
        <button type="submit" className="shrink-0 rounded-[8px] bg-bank-primaria px-4 py-2 text-sm font-medium text-white">
          Salvar plano
        </button>
      </div>
    </form>
  );
}
