import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ImportadorExtrato } from "@/components/financeiro/importador-extrato";
import type { Categoria } from "@/lib/tipos";

export default async function ImportarExtrato() {
  const supabase = await createClient();

  const [{ data: categorias }, { data: importados }] = await Promise.all([
    supabase.from("categorias").select("id, nome, tipo").order("tipo").order("nome"),
    supabase.from("transacoes").select("ofx_fitid").not("ofx_fitid", "is", null),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Importar extrato
          </h1>
          <p className="text-sm text-ink-faint">
            Entradas e saídas do .ofx viram lançamentos de caixa categorizados
            — importar o mesmo arquivo duas vezes não duplica nada
          </p>
        </div>
        <Link href="/financeiro" className="text-sm text-ink-faint hover:text-ink">
          ← Voltar
        </Link>
      </div>
      <Card>
        <ImportadorExtrato
          categorias={(categorias ?? []) as Categoria[]}
          fitidsImportados={(importados ?? []).map((i) => i.ofx_fitid as string)}
        />
      </Card>
    </div>
  );
}
