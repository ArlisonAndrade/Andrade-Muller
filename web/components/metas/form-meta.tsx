import Link from "next/link";
import { salvarMeta, excluirMeta } from "@/lib/acoes/metas";
import { BotaoExcluir } from "@/components/crm/botao-excluir";

export interface Meta {
  id: string;
  objetivo: string;
  key_result: string;
  trimestre: string | null;
  valor_alvo: number | null;
  valor_atual: number;
  status: "em_andamento" | "concluido" | "atrasado";
}

const estiloInput =
  "w-full rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink outline-none focus:border-bronze";

function Campo({
  rotulo,
  children,
  className = "",
}: {
  rotulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-faint">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

export function FormMeta({ meta }: { meta?: Meta }) {
  return (
    <form action={salvarMeta} className="grid grid-cols-2 gap-4">
      {meta && <input type="hidden" name="id" value={meta.id} />}

      <Campo rotulo="Objetivo *" className="col-span-2">
        <input
          name="objetivo"
          required
          placeholder="Aumentar a receita recorrente"
          defaultValue={meta?.objetivo ?? ""}
          className={estiloInput}
        />
      </Campo>

      <Campo rotulo="Key result *" className="col-span-2">
        <input
          name="key_result"
          required
          placeholder="Fechar 3T26 com R$ 30.000 de faturamento"
          defaultValue={meta?.key_result ?? ""}
          className={estiloInput}
        />
      </Campo>

      <Campo rotulo="Trimestre">
        <input name="trimestre" placeholder="3T26" defaultValue={meta?.trimestre ?? ""} className={estiloInput} />
      </Campo>
      <Campo rotulo="Status">
        <select name="status" defaultValue={meta?.status ?? "em_andamento"} className={estiloInput}>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
          <option value="atrasado">Atrasado</option>
        </select>
      </Campo>

      <Campo rotulo="Valor alvo">
        <input
          name="valor_alvo"
          inputMode="decimal"
          placeholder="30000"
          defaultValue={meta?.valor_alvo != null ? String(meta.valor_alvo).replace(".", ",") : ""}
          className={estiloInput}
        />
      </Campo>
      <Campo rotulo="Valor atual">
        <input
          name="valor_atual"
          inputMode="decimal"
          placeholder="0"
          defaultValue={meta ? String(meta.valor_atual).replace(".", ",") : ""}
          className={estiloInput}
        />
      </Campo>

      <div className="col-span-2 flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Salvar
          </button>
          <Link href="/metas" className="text-sm text-ink-faint hover:text-ink">
            Cancelar
          </Link>
        </div>
        {meta && <BotaoExcluir aoConfirmar={excluirMeta.bind(null, meta.id)} />}
      </div>
    </form>
  );
}
