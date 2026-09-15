import type { EstadoConquista } from "@/lib/bank/conquistas";
import { ROTULO_TRILHA, type Trilha } from "@/lib/bank/conquistas-visual";
import { Medalha } from "@/components/bank/conquistas/medalha";
import { LinhaHistoria } from "@/components/bank/conquistas/linha-historia";

const ORDEM: Trilha[] = ["degraus", "aporte", "semana", "divida", "arthur", "fases"];
const NIVEL_ROTULO = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante" } as const;

const dataBR = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

// Vitrine de medalhas da família. Conquistadas em cor, com a data do fato;
// bloqueadas em cinza, com a barra do quanto falta. As "ao alcance" ganham
// destaque no topo — é o que a família pode buscar este mês.
export function VitrineConquistas({ estados: todos, alcance }: { estados: EstadoConquista[]; alcance: EstadoConquista[] }) {
  // Selos da história ficam fora da contagem: não são pontuação, são a vida.
  const historia = todos.filter((e) => e.trilha === "historia");
  const estados = todos.filter((e) => e.trilha !== "historia");
  const total = estados.length;
  const ganhas = estados.filter((e) => e.conquistada).length;

  return (
    <div className="flex flex-col gap-5">
      {historia.length > 0 && (
        <div className="rounded-[14px] bg-gradient-to-br from-zinc-900 to-zinc-800 p-4 sm:p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">{ROTULO_TRILHA.historia}</p>
          <LinhaHistoria selos={historia} escuro />
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-text-secondary">
          <strong className="text-2xl font-semibold text-text-primary numeros-tabulares">{ganhas}</strong> de {total}{" "}
          conquistas
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3 sm:w-64">
          <div className="h-full rounded-full bg-bank-positivo" style={{ width: `${(ganhas / total) * 100}%` }} />
        </div>
      </div>

      {alcance.length > 0 && (
        <div className="rounded-[12px] border border-bank-primaria/40 bg-bank-primaria-bg/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bank-primaria">Ao alcance</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {alcance.map((e) => (
              <div key={e.codigo} className="flex items-center gap-3">
                <Medalha emoji={e.emoji} nivel={e.nivel} bloqueada tamanho={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{e.nome}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-bank-primaria" style={{ width: `${e.progresso}%` }} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-faint">{Math.round(e.progresso)}% · {e.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ORDEM.map((trilha) => {
        const daTrilha = estados.filter((e) => e.trilha === trilha);
        if (daTrilha.length === 0) return null;
        return (
          <div key={trilha}>
            <p className="mb-2 text-xs font-semibold text-text-secondary">{ROTULO_TRILHA[trilha]}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {daTrilha.map((e) => (
                <div
                  key={e.codigo}
                  title={`${e.nome} (${NIVEL_ROTULO[e.nivel]}) — ${e.descricao}`}
                  className={`flex flex-col items-center gap-1.5 rounded-[10px] border p-2.5 text-center ${
                    e.conquistada ? "border-border bg-surface-1" : "border-dashed border-border bg-surface-2"
                  }`}
                >
                  <Medalha emoji={e.emoji} nivel={e.nivel} bloqueada={!e.conquistada} tamanho={48} />
                  <p className={`text-[11px] font-medium leading-tight ${e.conquistada ? "text-text-primary" : "text-text-faint"}`}>
                    {e.nome}
                  </p>
                  {e.conquistada && e.data ? (
                    <p className="text-[10px] text-bank-positivo">{dataBR(e.data)}</p>
                  ) : (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-text-faint" style={{ width: `${e.progresso}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
