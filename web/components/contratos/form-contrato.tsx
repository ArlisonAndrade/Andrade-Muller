import Link from "next/link";
import { salvarContrato, excluirContrato } from "@/lib/acoes/contratos";
import { nomeCliente, type Cliente } from "@/lib/tipos";
import { BotaoExcluir } from "@/components/crm/botao-excluir";

export interface Contrato {
  id: string;
  cliente_id: string;
  tipo: "mensal_recorrente" | "projeto_fechado" | "hora";
  valor_mensal: number | null;
  valor_total_contrato: number | null;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  cliente?: Pick<Cliente, "empresa" | "nome_contato"> | null;
}

export const TIPOS_CONTRATO = [
  { valor: "mensal_recorrente", rotulo: "Mensal recorrente" },
  { valor: "projeto_fechado", rotulo: "Projeto fechado" },
  { valor: "hora", rotulo: "Por hora" },
] as const;

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

export function FormContrato({
  contrato,
  clientes,
}: {
  contrato?: Contrato;
  clientes: Pick<Cliente, "id" | "empresa" | "nome_contato">[];
}) {
  return (
    <form action={salvarContrato} className="grid grid-cols-2 gap-4">
      {contrato && <input type="hidden" name="id" value={contrato.id} />}

      <Campo rotulo="Cliente *">
        <select name="cliente_id" required defaultValue={contrato?.cliente_id ?? ""} className={estiloInput}>
          <option value="" disabled>
            Selecione…
          </option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {nomeCliente(c)}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Tipo">
        <select name="tipo" defaultValue={contrato?.tipo ?? "mensal_recorrente"} className={estiloInput}>
          {TIPOS_CONTRATO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </Campo>

      <Campo rotulo="Valor mensal (R$)">
        <input
          name="valor_mensal"
          inputMode="decimal"
          placeholder="4000,00"
          defaultValue={contrato?.valor_mensal != null ? String(contrato.valor_mensal).replace(".", ",") : ""}
          className={estiloInput}
        />
      </Campo>
      <Campo rotulo="Valor total do contrato (R$)">
        <input
          name="valor_total_contrato"
          inputMode="decimal"
          placeholder="48000,00"
          defaultValue={contrato?.valor_total_contrato != null ? String(contrato.valor_total_contrato).replace(".", ",") : ""}
          className={estiloInput}
        />
      </Campo>

      <Campo rotulo="Início da vigência *">
        <input name="data_inicio" type="date" required defaultValue={contrato?.data_inicio ?? ""} className={estiloInput} />
      </Campo>
      <Campo rotulo="Fim da vigência">
        <input name="data_fim" type="date" defaultValue={contrato?.data_fim ?? ""} className={estiloInput} />
      </Campo>

      <label className="col-span-2 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={contrato?.ativo ?? true}
          className="h-4 w-4 accent-salvia"
        />
        Contrato ativo
      </label>

      <div className="col-span-2 flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Salvar
          </button>
          <Link href="/contratos" className="text-sm text-ink-faint hover:text-ink">
            Cancelar
          </Link>
        </div>
        {contrato && <BotaoExcluir aoConfirmar={excluirContrato.bind(null, contrato.id)} />}
      </div>
    </form>
  );
}
