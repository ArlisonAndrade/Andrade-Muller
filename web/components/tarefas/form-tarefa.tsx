import Link from "next/link";
import { salvarTarefa, excluirTarefa } from "@/lib/acoes/tarefas";
import {
  PRIORIDADES_TAREFA,
  nomeCliente,
  type Cliente,
  type Tarefa,
} from "@/lib/tipos";
import { BotaoExcluir } from "@/components/crm/botao-excluir";

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

export function FormTarefa({
  tarefa,
  clientes,
}: {
  tarefa?: Tarefa;
  clientes: Pick<Cliente, "id" | "empresa" | "nome_contato">[];
}) {
  return (
    <form action={salvarTarefa} className="grid grid-cols-2 gap-4">
      {tarefa && <input type="hidden" name="id" value={tarefa.id} />}

      <Campo rotulo="Título *" className="col-span-2">
        <input name="titulo" required defaultValue={tarefa?.titulo ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Cliente *">
        <select name="cliente_id" required defaultValue={tarefa?.cliente_id ?? ""} className={estiloInput}>
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
      <Campo rotulo="Responsável">
        <input name="responsavel" defaultValue={tarefa?.responsavel ?? "Franciele"} className={estiloInput} />
      </Campo>

      <Campo rotulo="Prioridade">
        <select name="prioridade" defaultValue={tarefa?.prioridade ?? "media"} className={estiloInput}>
          {PRIORIDADES_TAREFA.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Prazo">
        <input name="data_prazo" type="date" defaultValue={tarefa?.data_prazo ?? ""} className={estiloInput} />
      </Campo>

      {tarefa && (
        <label className="col-span-2 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="concluida"
            defaultChecked={tarefa.concluida}
            className="h-4 w-4 accent-salvia"
          />
          Concluída
        </label>
      )}

      <div className="col-span-2 flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Salvar
          </button>
          <Link href="/tarefas" className="text-sm text-ink-faint hover:text-ink">
            Cancelar
          </Link>
        </div>
        {tarefa && <BotaoExcluir aoConfirmar={excluirTarefa.bind(null, tarefa.id)} />}
      </div>
    </form>
  );
}
