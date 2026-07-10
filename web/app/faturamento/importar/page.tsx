import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ImportadorOfx } from "@/components/faturamento/importador-ofx";

export default async function ImportarExtrato() {
  const supabase = await createClient();

  const [{ data: clientes }, { data: importados }] = await Promise.all([
    supabase.from("fm_clientes").select("id, empresa, nome_contato").order("empresa"),
    supabase
      .from("fm_faturamento")
      .select("arquivo_origem")
      .like("arquivo_origem", "ofx:%"),
  ]);

  const fitidsImportados = (importados ?? []).map((i) =>
    (i.arquivo_origem as string).slice(4),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Importar extrato
          </h1>
          <p className="text-sm text-ink-faint">
            Envie o .ofx do banco — os créditos viram lançamentos de
            faturamento, com cliente sugerido automaticamente
          </p>
        </div>
        <Link href="/faturamento" className="text-sm text-ink-faint hover:text-ink">
          ← Voltar
        </Link>
      </div>
      <Card>
        <ImportadorOfx
          clientes={clientes ?? []}
          fitidsImportados={fitidsImportados}
        />
      </Card>
    </div>
  );
}
