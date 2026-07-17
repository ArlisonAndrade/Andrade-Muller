import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FormTarefa } from "@/components/tarefas/form-tarefa";
import { createClient } from "@/lib/supabase/server";
import type { Tarefa } from "@/lib/tipos";

export default async function EditarTarefa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tarefa }, { data: clientes }] = await Promise.all([
    supabase.from("fm_tarefas").select("*").eq("id", id).maybeSingle(),
    supabase.from("fm_clientes").select("id, empresa, nome_contato").order("empresa"),
  ]);

  if (!tarefa) notFound();
  const t = tarefa as Tarefa;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        {t.titulo}
      </h1>
      <Card>
        <FormTarefa tarefa={t} clientes={clientes ?? []} />
      </Card>
      {t.reuniao_origem_id && (
        <p className="mt-4 text-xs text-ink-faint">
          Nascida de uma reunião —{" "}
          <Link
            href={`/reunioes/${t.reuniao_origem_id}`}
            className="text-marinho underline"
          >
            ver a reunião de origem
          </Link>
        </p>
      )}
    </div>
  );
}
