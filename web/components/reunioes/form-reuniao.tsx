import Link from "next/link";
import { salvarReuniao, excluirReuniao } from "@/lib/acoes/reunioes";
import {
  TIPOS_REUNIAO,
  STATUS_REUNIAO,
  nomeCliente,
  type Cliente,
  type Reuniao,
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

export function FormReuniao({
  reuniao,
  clientes,
  projetos = [],
}: {
  reuniao?: Reuniao & { projeto_id?: string | null };
  clientes: Pick<Cliente, "id" | "empresa" | "nome_contato">[];
  projetos?: { id: string; nome: string }[];
}) {
  return (
    <form action={salvarReuniao} className="grid grid-cols-2 gap-4">
      {reuniao && <input type="hidden" name="id" value={reuniao.id} />}

      <Campo rotulo="Título *" className="col-span-2">
        <input name="titulo" required defaultValue={reuniao?.titulo ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Cliente *">
        <select name="cliente_id" required defaultValue={reuniao?.cliente_id ?? ""} className={estiloInput}>
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
      <Campo rotulo="Data e hora *">
        <input
          name="data_reuniao"
          type="datetime-local"
          required
          defaultValue={reuniao?.data_reuniao?.slice(0, 16) ?? ""}
          className={estiloInput}
        />
      </Campo>

      <Campo rotulo="Tipo">
        <select name="tipo" defaultValue={reuniao?.tipo ?? "acompanhamento"} className={estiloInput}>
          {TIPOS_REUNIAO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Status">
        <select name="status" defaultValue={reuniao?.status ?? "agendada"} className={estiloInput}>
          {STATUS_REUNIAO.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
      </Campo>

      {projetos.length > 0 && (
        <Campo rotulo="Projeto (opcional)" className="col-span-2">
          <select
            name="projeto_id"
            defaultValue={reuniao?.projeto_id ?? ""}
            className={estiloInput}
          >
            <option value="">— sem projeto —</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo rotulo="Ata (resumo executivo)" className="col-span-2">
        <textarea name="ata" rows={4} defaultValue={reuniao?.ata ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Decisões tomadas" className="col-span-2">
        <textarea name="decisoes_tomadas" rows={3} defaultValue={reuniao?.decisoes_tomadas ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Próximos passos" className="col-span-2">
        <textarea name="proximos_passos" rows={3} defaultValue={reuniao?.proximos_passos ?? ""} className={estiloInput} />
      </Campo>

      <Campo rotulo="Ações definidas (texto livre — itens acionáveis viram tarefas abaixo)" className="col-span-2">
        <textarea name="acoes_definidas" rows={3} defaultValue={reuniao?.acoes_definidas ?? ""} className={estiloInput} />
      </Campo>

      <div className="col-span-2 flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Salvar
          </button>
          <Link href="/reunioes" className="text-sm text-ink-faint hover:text-ink">
            Cancelar
          </Link>
        </div>
        {reuniao && <BotaoExcluir aoConfirmar={excluirReuniao.bind(null, reuniao.id)} />}
      </div>
    </form>
  );
}
