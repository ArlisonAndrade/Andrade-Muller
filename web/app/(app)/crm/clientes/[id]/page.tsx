import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FormCliente } from "@/components/crm/form-cliente";
import { createClient } from "@/lib/supabase/server";
import { nomeCliente, type Cliente } from "@/lib/tipos";

export default async function EditarCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("fm_clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const cliente = data as Cliente;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        {nomeCliente(cliente)}
      </h1>
      <Card>
        <FormCliente cliente={cliente} />
      </Card>
    </div>
  );
}
