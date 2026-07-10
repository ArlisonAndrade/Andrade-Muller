import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { lancarNfse } from "@/lib/acoes/faturamento";
import { nomeCliente } from "@/lib/tipos";

const estiloInput =
  "w-full rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink outline-none focus:border-bronze";

export default async function LancarNfse() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("fm_clientes")
    .select("id, empresa, nome_contato")
    .order("empresa");

  const mesAtual = new Date().toISOString().slice(0, 7);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Lançar NFS-e
      </h1>
      <Card>
        <form action={lancarNfse} className="grid grid-cols-2 gap-4">
          <label className="col-span-2 block">
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Cliente *
            </span>
            <select name="cliente_id" required defaultValue="" className={estiloInput}>
              <option value="" disabled>
                Selecione…
              </option>
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {nomeCliente(c)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Número da NFS-e
            </span>
            <input name="numero_nfse" placeholder="NFS-e #033" className={estiloInput} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Valor (R$) *
            </span>
            <input name="valor" required inputMode="decimal" placeholder="4000,00" className={estiloInput} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Competência *
            </span>
            <input name="competencia" type="month" required defaultValue={mesAtual} className={estiloInput} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Data de emissão
            </span>
            <input name="data_emissao" type="date" className={estiloInput} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-faint">
              Status
            </span>
            <select name="status" defaultValue="concluido" className={estiloInput}>
              <option value="concluido">Concluído</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </label>

          <div className="col-span-2 flex items-center gap-4 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
            >
              Lançar
            </button>
            <Link href="/faturamento" className="text-sm text-ink-faint hover:text-ink">
              Cancelar
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
