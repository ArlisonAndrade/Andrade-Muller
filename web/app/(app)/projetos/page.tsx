import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { nomeCliente, type Projeto, type Tarefa } from "@/lib/tipos";
import { dataBR } from "@/lib/formato";

const ROTULO_STATUS: Record<string, { texto: string; cor: string }> = {
  ativo: { texto: "Ativo", cor: "bg-salvia/15 text-salvia" },
  pausado: { texto: "Pausado", cor: "bg-bronze/15 text-bronze" },
  concluido: { texto: "Concluído", cor: "bg-divider text-ink-faint" },
};

export default async function PaginaProjetos() {
  const supabase = await createClient();
  const [{ data: projetos }, { data: tarefas }] = await Promise.all([
    supabase
      .from("fm_projetos")
      .select("*, cliente:fm_clientes(empresa, nome_contato)")
      .order("created_at", { ascending: false }),
    supabase.from("fm_tarefas").select("projeto_id, concluida").not("projeto_id", "is", null),
  ]);

  const lista = (projetos ?? []) as Projeto[];
  const porProjeto = new Map<string, { total: number; feitas: number }>();
  for (const t of (tarefas ?? []) as Pick<Tarefa, "concluida">[] & { projeto_id: string }[]) {
    const p = porProjeto.get(t.projeto_id) ?? { total: 0, feitas: 0 };
    p.total += 1;
    if (t.concluida) p.feitas += 1;
    porProjeto.set(t.projeto_id, p);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Projetos
          </h1>
          <p className="text-sm text-ink-faint">
            Consultoria individual — cada projeto nasce com o cronograma da
            Biblioteca de Templates
          </p>
        </div>
        <Link
          href="/projetos/novo"
          className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
        >
          + Novo projeto
        </Link>
      </div>

      {lista.length === 0 && (
        <Card>
          <p className="text-sm text-ink-faint">
            Nenhum projeto ainda — crie o primeiro e o cronograma se monta
            sozinho.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {lista.map((p) => {
          const prog = porProjeto.get(p.id) ?? { total: 0, feitas: 0 };
          const pct = prog.total > 0 ? Math.round((prog.feitas / prog.total) * 100) : 0;
          const st = ROTULO_STATUS[p.status] ?? ROTULO_STATUS.ativo;
          return (
            <Link
              key={p.id}
              href={`/projetos/${p.id}`}
              className="block rounded-card bg-card p-5 shadow-card transition-shadow hover:shadow-md"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-lg font-medium text-ink">{p.nome}</h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cor}`}>
                  {st.texto}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-faint">
                {p.cliente ? nomeCliente(p.cliente) : "—"} · início {dataBR(p.data_inicio)}
                {p.data_fim_prevista && ` · previsão ${dataBR(p.data_fim_prevista)}`}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider">
                  <div className="h-full rounded-full bg-salvia" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-display text-xs font-semibold text-ink-soft">
                  {prog.feitas}/{prog.total} tarefas
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
