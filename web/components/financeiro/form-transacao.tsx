import Link from "next/link";
import { salvarTransacao, excluirTransacao } from "@/lib/acoes/financeiro";
import { BotaoExcluir } from "@/components/crm/botao-excluir";
import type { Categoria, Conta, Transacao } from "@/lib/tipos";

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

export function FormTransacao({
  transacao,
  categorias,
  contas,
}: {
  transacao?: Transacao;
  categorias: Categoria[];
  contas: Conta[];
}) {
  const receitas = categorias.filter((c) => c.tipo === "receita");
  const despesas = categorias.filter((c) => c.tipo === "despesa");

  return (
    <form action={salvarTransacao} className="grid grid-cols-2 gap-4">
      {transacao && <input type="hidden" name="id" value={transacao.id} />}

      <Campo rotulo="Descrição *" className="col-span-2">
        <input name="descricao" required defaultValue={transacao?.descricao ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Categoria *">
        <select name="categoria_id" required defaultValue={transacao?.categoria_id ?? ""} className={estiloInput}>
          <option value="" disabled>
            Selecione…
          </option>
          <optgroup label="Receitas">
            {receitas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </optgroup>
          <optgroup label="Despesas">
            {despesas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </optgroup>
        </select>
      </Campo>
      <Campo rotulo="Valor (R$) *">
        <input
          name="valor"
          required
          inputMode="decimal"
          placeholder="1500,00"
          defaultValue={transacao ? String(transacao.valor).replace(".", ",") : ""}
          className={estiloInput}
        />
      </Campo>

      <Campo rotulo="Data *">
        <input
          name="data"
          type="date"
          required
          defaultValue={transacao?.data ?? new Date().toISOString().slice(0, 10)}
          className={estiloInput}
        />
      </Campo>
      <Campo rotulo="Conta">
        <select name="conta_id" defaultValue={transacao?.conta_id ?? contas[0]?.id ?? ""} className={estiloInput}>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </Campo>

      <label className="col-span-2 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="recorrente"
          defaultChecked={transacao?.recorrente ?? false}
          className="h-4 w-4 accent-salvia"
        />
        Recorrente (repete todo mês)
      </label>

      <div className="col-span-2 flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Salvar
          </button>
          <Link href="/financeiro" className="text-sm text-ink-faint hover:text-ink">
            Cancelar
          </Link>
        </div>
        {transacao && (
          <BotaoExcluir aoConfirmar={excluirTransacao.bind(null, transacao.id)} />
        )}
      </div>
    </form>
  );
}
