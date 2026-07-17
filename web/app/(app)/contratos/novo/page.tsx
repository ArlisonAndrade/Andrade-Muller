import { Card } from "@/components/ui/card";
import { FormContrato } from "@/components/contratos/form-contrato";
import { createClient } from "@/lib/supabase/server";

export default async function NovoContrato() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("fm_clientes")
    .select("id, empresa, nome_contato")
    .order("empresa");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Novo contrato
      </h1>
      <Card>
        <FormContrato clientes={clientes ?? []} />
      </Card>
    </div>
  );
}
