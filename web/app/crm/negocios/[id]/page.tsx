import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FormNegocio } from "@/components/crm/form-negocio";
import { createClient } from "@/lib/supabase/server";
import type { Negocio } from "@/lib/tipos";

export default async function EditarNegocio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: negocio }, { data: clientes }] = await Promise.all([
    supabase.from("fm_negocios").select("*").eq("id", id).maybeSingle(),
    supabase.from("fm_clientes").select("id, empresa, nome_contato").order("empresa"),
  ]);

  if (!negocio) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        {(negocio as Negocio).nome_negocio}
      </h1>
      <Card>
        <FormNegocio negocio={negocio as Negocio} clientes={clientes ?? []} />
      </Card>
    </div>
  );
}
