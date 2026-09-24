import type { EstadoConquista } from "@/lib/bank/conquistas";
import { ROTULO_TRILHA, type Trilha } from "@/lib/bank/conquistas-visual";
import { Medalha } from "@/components/bank/conquistas/medalha";
import { CartaoConquista } from "@/components/bank/conquistas/cartao-conquista";

const ORDEM: Trilha[] = ["degraus", "aporte", "semana", "divida", "arthur", "fases"];
// Vitrine de medalhas da família. Conquistadas em cor, com a data do fato;
// bloqueadas em cinza, com a barra do quanto falta. As "ao alcance" ganham
// destaque no topo — é o que a família pode buscar este mês. Toda medalha
// abre o detalhe ao clicar; os selos da história abrem a vitrine, centralizados.
export function VitrineConquistas({ estados: todos, alcance }: { estados: EstadoConquista[]; alcance: EstadoConquista[] }) {
  // Selos da história ficam fora da contagem: não são pontuação, são a vida.
  const ORDEM_HISTORIA = ["historia_fundo_do_poco", "historia_negociacao_bb", "historia_fim_santander"];
  const historia = todos
    .filter((e) => e.trilha === "historia")
    .sort((a, b) => ORDEM_HISTORIA.indexOf(a.codigo) - ORDEM_HISTORIA.indexOf(b.codigo));
  const estados = todos.filter((e) => e.trilha !== "historia");
  const total = estados.length;
  const ganhas = estados.filter((e) => e.conquistada).length;

  return (
    <div className="flex flex-col gap-5">
      {historia.length > 0 && (
        <div>
          <p className="mb-2 text-center text-xs font-semibold text-text-secondary">{ROTULO_TRILHA.historia}</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {historia.map((e) => (
              <CartaoConquista key={e.codigo} estado={e} destaque />
            ))}
          </div>
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
                <CartaoConquista key={e.codigo} estado={e} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
