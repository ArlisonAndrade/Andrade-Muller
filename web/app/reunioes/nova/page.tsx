import { Card } from "@/components/ui/card";
import { FormReuniao } from "@/components/reunioes/form-reuniao";
import { createClient } from "@/lib/supabase/server";

export default async function NovaReuniao() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("fm_clientes")
    .select("id, empresa, nome_contato")
    .order("empresa");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Nova reunião
      </h1>
      <Card>
        <FormReuniao clientes={clientes ?? []} />
      </Card>
    </div>
  );
}
