import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  FormContrato,
  type Contrato,
} from "@/components/contratos/form-contrato";
import { createClient } from "@/lib/supabase/server";
import { nomeCliente } from "@/lib/tipos";

export default async function EditarContrato({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: contrato }, { data: clientes }] = await Promise.all([
    supabase
      .from("fm_contratos")
      .select("*, cliente:fm_clientes(empresa, nome_contato)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("fm_clientes").select("id, empresa, nome_contato").order("empresa"),
  ]);

  if (!contrato) notFound();
  const c = contrato as Contrato;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Contrato — {c.cliente ? nomeCliente(c.cliente) : ""}
      </h1>
      <Card>
        <FormContrato contrato={c} clientes={clientes ?? []} />
      </Card>
    </div>
  );
}
