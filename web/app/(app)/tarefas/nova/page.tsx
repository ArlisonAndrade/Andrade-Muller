import { Card } from "@/components/ui/card";
import { FormTarefa } from "@/components/tarefas/form-tarefa";
import { createClient } from "@/lib/supabase/server";

export default async function NovaTarefa() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("fm_clientes")
    .select("id, empresa, nome_contato")
    .order("empresa");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Nova tarefa
      </h1>
      <Card>
        <FormTarefa clientes={clientes ?? []} />
      </Card>
    </div>
  );
}
