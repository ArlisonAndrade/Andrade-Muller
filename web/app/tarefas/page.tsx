import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { alternarConclusao, definirEisenhower } from "@/lib/acoes/tarefas";
import { CheckboxTarefa } from "@/components/tarefas/checkbox-tarefa";
import { SeletorKanban } from "@/components/crm/seletor-kanban";
import {
  PRIORIDADES_TAREFA,
  QUADRANTES_EISENHOWER,
  nomeCliente,
  type Cliente,
  type Tarefa,
} from "@/lib/tipos";

const OPCOES_MATRIZ = [
  { valor: "", rotulo: "— matriz —" },
  ...QUADRANTES_EISENHOWER.map((q) => ({ valor: q.valor, rotulo: q.rotulo })),
];
import { dataBR } from "@/lib/formato";

const COR_PRIORIDADE: Record<string, string> = {
  critica: "bg-terracota/15 text-terracota",
  alta: "bg-bronze/15 text-bronze",
  media: "bg-marinho/10 text-marinho",
  baixa: "bg-divider text-ink-faint",
};

function rotuloPrioridade(valor: string) {
  return PRIORIDADES_TAREFA.find((p) => p.valor === valor)?.rotulo ?? valor;
}

function LinhaTarefa({ tarefa, hoje }: { tarefa: Tarefa; hoje: string }) {
  const atrasada =
    !tarefa.concluida && !!tarefa.data_prazo && tarefa.data_prazo < hoje;
  return (
    <div className="flex items-center gap-3 border-b border-divider/50 py-2.5 last:border-0">
      <CheckboxTarefa
        concluida={tarefa.concluida}
        aoAlternar={alternarConclusao.bind(null, tarefa.id)}
      />
      <Link
        href={`/tarefas/${tarefa.id}`}
        className={`flex-1 text-sm hover:text-marinho ${
          tarefa.concluida ? "text-ink-faint line-through" : "text-ink"
        }`}
      >
        {tarefa.titulo}
      </Link>
      {!tarefa.concluida && (
        <span className="w-32 shrink-0 [&_select]:mt-0">
          <SeletorKanban
            valor={tarefa.eisenhower ?? ""}
            opcoes={OPCOES_MATRIZ}
            aoMudar={definirEisenhower.bind(null, tarefa.id)}
          />
        </span>
      )}
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_PRIORIDADE[tarefa.prioridade] ?? ""}`}
      >
        {rotuloPrioridade(tarefa.prioridade)}
      </span>
      <span className="w-20 text-xs text-ink-faint">
        {tarefa.responsavel ?? (
          <span className="font-medium text-terracota">sem resp.</span>
        )}
      </span>
      <span
        className={`w-24 text-right text-xs ${
          atrasada ? "font-medium text-terracota" : "text-ink-faint"
        }`}
      >
        {tarefa.data_prazo ? dataBR(tarefa.data_prazo) : "sem prazo"}
        {atrasada && " ⚠"}
      </span>
    </div>
  );
}

export default async function PaginaTarefas({
  searchParams,
}: {
  searchParams: Promise<{ resp?: string; cliente?: string; ver?: string }>;
}) {
  const { resp, cliente, ver } = await searchParams;
  const verConcluidas = ver === "todas";

  const supabase = await createClient();
  const { data } = await supabase
    .from("fm_tarefas")
    .select("*, cliente:fm_clientes(empresa, nome_contato)")
    .order("data_prazo", { ascending: true, nullsFirst: false })
    .order("created_at");

  const todas = (data ?? []) as Tarefa[];

  const hoje = new Date().toISOString().slice(0, 10);
  const daquiA7 = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // View "minha semana" (PRD 1.3): vence nos próximos 7 dias ou já atrasou,
  // cruzando todos os clientes — sem passar pelos filtros abaixo.
  const semana = todas.filter(
    (t) => !t.concluida && t.data_prazo && t.data_prazo <= daquiA7,
  );

  // Alerta automático (PRD 1.3): tarefa crítica sem responsável definido
  const criticasSemResponsavel = todas.filter(
    (t) => !t.concluida && t.prioridade === "critica" && !t.responsavel,
  );

  const responsaveis = [
    ...new Set(todas.map((t) => t.responsavel).filter(Boolean)),
  ] as string[];
  const clientesComTarefa = new Map<string, string>();
  for (const t of todas) {
    if (t.cliente) clientesComTarefa.set(t.cliente_id, nomeCliente(t.cliente));
  }

  const filtradas = todas.filter(
    (t) =>
      (verConcluidas || !t.concluida) &&
      (!resp || t.responsavel === resp) &&
      (!cliente || t.cliente_id === cliente),
  );

  // Agrupar por cliente
  const porCliente = new Map<string, { nome: string; tarefas: Tarefa[] }>();
  for (const t of filtradas) {
    const grupo = porCliente.get(t.cliente_id) ?? {
      nome: t.cliente ? nomeCliente(t.cliente) : "—",
      tarefas: [],
    };
    grupo.tarefas.push(t);
    porCliente.set(t.cliente_id, grupo);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Tarefas
          </h1>
          <p className="text-sm text-ink-faint">
            Hub central — por cliente e por responsável
          </p>
        </div>
        <Link
          href="/tarefas/nova"
          className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
        >
          + Nova tarefa
        </Link>
      </div>

      {criticasSemResponsavel.length > 0 && (
        <div className="mb-4 rounded-card bg-terracota/10 px-4 py-3 text-sm font-medium text-terracota shadow-card">
          ⚠ {criticasSemResponsavel.length} tarefa(s) crítica(s) sem
          responsável definido:{" "}
          {criticasSemResponsavel.map((t) => t.titulo).join(" · ")}
        </div>
      )}

      <Card title="Minha semana" className="mb-6">
        <p className="mb-2 text-xs text-ink-faint">
          Atrasadas e com vencimento até {dataBR(daquiA7)}, todos os clientes
        </p>
        {semana.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Nada vencendo nos próximos 7 dias.
          </p>
        ) : (
          <div>
            {semana.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-xs text-ink-faint">
                  {t.cliente ? nomeCliente(t.cliente) : "—"}
                </span>
                <div className="flex-1">
                  <LinhaTarefa tarefa={t} hoje={hoje} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <form method="GET" className="mb-4 flex items-center gap-3 text-sm">
        <select
          name="resp"
          defaultValue={resp ?? ""}
          className="rounded-lg border border-divider bg-card px-3 py-1.5 text-sm text-ink outline-none"
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          name="cliente"
          defaultValue={cliente ?? ""}
          className="rounded-lg border border-divider bg-card px-3 py-1.5 text-sm text-ink outline-none"
        >
          <option value="">Todos os clientes</option>
          {[...clientesComTarefa.entries()].map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input
            type="checkbox"
            name="ver"
            value="todas"
            defaultChecked={verConcluidas}
            className="accent-marinho"
          />
          mostrar concluídas
        </label>
        <button
          type="submit"
          className="rounded-lg border border-divider bg-card px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
          Filtrar
        </button>
      </form>

      {porCliente.size === 0 ? (
        <Card>
          <p className="text-sm text-ink-faint">
            Nenhuma tarefa com esses filtros.
          </p>
        </Card>
      ) : (
        [...porCliente.entries()].map(([id, grupo]) => (
          <Card key={id} title={grupo.nome} className="mb-4">
            {grupo.tarefas.map((t) => (
              <LinhaTarefa key={t.id} tarefa={t} hoje={hoje} />
            ))}
          </Card>
        ))
      )}
    </div>
  );
}
