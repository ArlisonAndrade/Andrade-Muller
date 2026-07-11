import { Card } from "@/components/ui/card";
import { FormTransacao } from "@/components/financeiro/form-transacao";
import { createClient } from "@/lib/supabase/server";
import type { Categoria, Conta } from "@/lib/tipos";

export default async function NovoLancamento() {
  const supabase = await createClient();
  const [{ data: categorias }, { data: contas }] = await Promise.all([
    supabase.from("categorias").select("id, nome, tipo").order("tipo").order("nome"),
    supabase.from("contas").select("id, nome").order("nome"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Novo lançamento de caixa
      </h1>
      <Card>
        <FormTransacao
          categorias={(categorias ?? []) as Categoria[]}
          contas={(contas ?? []) as Conta[]}
        />
      </Card>
    </div>
  );
}
