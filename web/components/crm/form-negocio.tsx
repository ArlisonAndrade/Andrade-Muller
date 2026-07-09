import Link from "next/link";
import { salvarNegocio, excluirNegocio } from "@/lib/acoes/crm";
import { ESTAGIOS_NEGOCIO, nomeCliente, type Cliente, type Negocio } from "@/lib/tipos";
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

export function FormNegocio({
  negocio,
  clientes,
}: {
  negocio?: Negocio;
  clientes: Pick<Cliente, "id" | "empresa" | "nome_contato">[];
}) {
  return (
    <form action={salvarNegocio} className="grid grid-cols-2 gap-4">
      {negocio && <input type="hidden" name="id" value={negocio.id} />}

      <Campo rotulo="Nome do negócio *" className="col-span-2">
        <input name="nome_negocio" required defaultValue={negocio?.nome_negocio ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Cliente *">
        <select name="cliente_id" required defaultValue={negocio?.cliente_id ?? ""} className={estiloInput}>
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
      <Campo rotulo="Valor (R$)">
        <input
          name="valor"
          inputMode="decimal"
          placeholder="48000,00"
          defaultValue={negocio ? String(negocio.valor).replace(".", ",") : ""}
          className={estiloInput}
        />
      </Campo>

      <Campo rotulo="Estágio">
        <select name="estagio" defaultValue={negocio?.estagio ?? "prospeccao"} className={estiloInput}>
          {ESTAGIOS_NEGOCIO.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.rotulo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Data prevista de fechamento">
        <input name="data_prevista_fechamento" type="date" defaultValue={negocio?.data_prevista_fechamento ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Próxima ação">
        <input name="proxima_acao" defaultValue={negocio?.proxima_acao ?? ""} className={estiloInput} />
      </Campo>
      <Campo rotulo="Data da próxima ação">
        <input name="proxima_acao_data" type="date" defaultValue={negocio?.proxima_acao_data ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Fim do contrato (se houver)">
        <input name="data_fim_contrato" type="date" defaultValue={negocio?.data_fim_contrato ?? ""} className={estiloInput} />
      </Campo>
      <Campo rotulo="Risco / oportunidade">
        <input name="risco_oportunidade" defaultValue={negocio?.risco_oportunidade ?? ""} className={estiloInput} />
      </Campo>

      <div className="col-span-2 flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Salvar
          </button>
          <Link href="/crm?aba=negocios" className="text-sm text-ink-faint hover:text-ink">
            Cancelar
          </Link>
        </div>
        {negocio && <BotaoExcluir aoConfirmar={excluirNegocio.bind(null, negocio.id)} />}
      </div>
    </form>
  );
}
