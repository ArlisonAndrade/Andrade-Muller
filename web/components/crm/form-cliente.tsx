import Link from "next/link";
import { salvarCliente, excluirCliente } from "@/lib/acoes/crm";
import { STATUS_CLIENTE, type Cliente } from "@/lib/tipos";
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

export function FormCliente({ cliente }: { cliente?: Cliente }) {
  return (
    <form action={salvarCliente} className="grid grid-cols-2 gap-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <Campo rotulo="Empresa (vazio se pessoa física)">
        <input name="empresa" defaultValue={cliente?.empresa ?? ""} className={estiloInput} />
      </Campo>
      <Campo rotulo="Nome do contato *">
        <input name="nome_contato" required defaultValue={cliente?.nome_contato ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="E-mail">
        <input name="email" type="email" defaultValue={cliente?.email ?? ""} className={estiloInput} />
      </Campo>
      <Campo rotulo="WhatsApp">
        <input name="whatsapp" defaultValue={cliente?.whatsapp ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Status">
        <select name="status" defaultValue={cliente?.status ?? "lead"} className={estiloInput}>
          {STATUS_CLIENTE.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Fonte do lead">
        <input name="fonte_lead" placeholder="Indicação, rede social…" defaultValue={cliente?.fonte_lead ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Responsável pela conta">
        <input name="responsavel_conta" defaultValue={cliente?.responsavel_conta ?? "Franciele"} className={estiloInput} />
      </Campo>
      <Campo rotulo="Último contato">
        <input name="ultimo_contato" type="date" defaultValue={cliente?.ultimo_contato ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Tags (separadas por vírgula)" className="col-span-2">
        <input name="tags" defaultValue={cliente?.tags?.join(", ") ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Endereço" className="col-span-2">
        <input name="endereco" defaultValue={cliente?.endereco ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Observações" className="col-span-2">
        <textarea name="observacoes" rows={3} defaultValue={cliente?.observacoes ?? ""} className={estiloInput} />
      </Campo>

      <div className="col-span-2 flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Salvar
          </button>
          <Link href="/crm" className="text-sm text-ink-faint hover:text-ink">
            Cancelar
          </Link>
        </div>
        {cliente && <BotaoExcluir aoConfirmar={excluirCliente.bind(null, cliente.id)} />}
      </div>
    </form>
  );
}
