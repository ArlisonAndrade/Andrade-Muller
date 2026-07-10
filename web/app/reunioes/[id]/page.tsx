import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FormReuniao } from "@/components/reunioes/form-reuniao";
import { createClient } from "@/lib/supabase/server";
import { criarTarefaDaReuniao } from "@/lib/acoes/reunioes";
import { PRIORIDADES_TAREFA, type Reuniao, type Tarefa } from "@/lib/tipos";
import { dataBR } from "@/lib/formato";

const estiloInput =
  "rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink outline-none focus:border-bronze";

export default async function EditarReuniao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: reuniao }, { data: clientes }, { data: tarefas }] =
    await Promise.all([
      supabase.from("fm_reunioes").select("*").eq("id", id).maybeSingle(),
      supabase.from("fm_clientes").select("id, empresa, nome_contato").order("empresa"),
      supabase
        .from("fm_tarefas")
        .select("*")
        .eq("reuniao_origem_id", id)
        .order("created_at"),
    ]);

  if (!reuniao) notFound();
  const r = reuniao as Reuniao;
  const tarefasDaReuniao = (tarefas ?? []) as Tarefa[];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        {r.titulo}
      </h1>

      <Card>
        <FormReuniao reuniao={r} clientes={clientes ?? []} />
      </Card>

      <Card title="Ações desta reunião → tarefas" className="mt-6">
        {tarefasDaReuniao.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {tarefasDaReuniao.map((t) => (
              <li
                key={t.id}
                className="flex items-baseline justify-between gap-3 rounded-lg bg-parchment/60 px-3 py-2"
              >
                <span
                  className={`text-sm ${t.concluida ? "text-ink-faint line-through" : "text-ink"}`}
                >
                  {t.titulo}
                </span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {t.responsavel}
                  {t.data_prazo && ` · até ${dataBR(t.data_prazo)}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        <form action={criarTarefaDaReuniao} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="reuniao_id" value={r.id} />
          <input type="hidden" name="cliente_id" value={r.cliente_id} />
          <label className="min-w-56 flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Nova tarefa a partir desta reunião
            </span>
            <input name="titulo" required placeholder="O que precisa ser feito?" className={`${estiloInput} w-full`} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Responsável
            </span>
            <input name="responsavel" defaultValue="Franciele" className={`${estiloInput} w-32`} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Prioridade
            </span>
            <select name="prioridade" defaultValue="media" className={estiloInput}>
              {PRIORIDADES_TAREFA.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Prazo
            </span>
            <input name="data_prazo" type="date" className={estiloInput} />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-salvia px-4 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Criar tarefa
          </button>
        </form>
      </Card>
    </div>
  );
}
