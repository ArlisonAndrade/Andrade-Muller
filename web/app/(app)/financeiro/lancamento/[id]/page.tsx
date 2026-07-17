import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FormTransacao } from "@/components/financeiro/form-transacao";
import { createClient } from "@/lib/supabase/server";
import type { Categoria, Conta, Transacao } from "@/lib/tipos";

export default async function EditarLancamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: transacao }, { data: categorias }, { data: contas }] =
    await Promise.all([
      supabase.from("transacoes").select("*").eq("id", id).maybeSingle(),
      supabase.from("categorias").select("id, nome, tipo").order("tipo").order("nome"),
      supabase.from("contas").select("id, nome").order("nome"),
    ]);

  if (!transacao) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Editar lançamento
      </h1>
      <Card>
        <FormTransacao
          transacao={transacao as Transacao}
          categorias={(categorias ?? []) as Categoria[]}
          contas={(contas ?? []) as Conta[]}
        />
      </Card>
    </div>
  );
}
