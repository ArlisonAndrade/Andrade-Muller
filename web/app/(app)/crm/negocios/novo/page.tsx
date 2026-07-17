import { Card } from "@/components/ui/card";
import { FormNegocio } from "@/components/crm/form-negocio";
import { createClient } from "@/lib/supabase/server";

export default async function NovoNegocio() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("fm_clientes")
    .select("id, empresa, nome_contato")
    .order("empresa");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Novo negócio
      </h1>
      <Card>
        <FormNegocio clientes={clientes ?? []} />
      </Card>
    </div>
  );
}
