import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  TIPOS_REUNIAO,
  STATUS_REUNIAO,
  nomeCliente,
  type Cliente,
  type Reuniao,
  type Tarefa,
} from "@/lib/tipos";
import { dataBR, dataHoraBR } from "@/lib/formato";
import { segundaDaSemana } from "@/lib/saude";
import {
  CalendarioSemana,
  addDias,
} from "@/components/reunioes/calendario-semana";

const CORES_STATUS: Record<string, string> = {
  agendada: "text-bronze",
  realizada: "text-salvia",
  cancelada: "text-ink-faint line-through",
};

function rotulo(lista: readonly { valor: string; rotulo: string }[], valor: string | null) {
  return lista.find((i) => i.valor === valor)?.rotulo ?? valor;
}

export default async function PaginaReunioes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cliente?: string; semana?: string }>;
}) {
  const { q, cliente, semana } = await searchParams;
  const supabase = await createClient();

  // Calendário semanal: reuniões + tarefas com prazo na semana escolhida
  const segunda = /^\d{4}-\d{2}-\d{2}$/.test(semana ?? "")
    ? (semana as string)
    : segundaDaSemana();
  const fimDaSemana = addDias(segunda, 7);

  const [{ data: reunioesSemana }, { data: tarefasSemana }] =
    await Promise.all([
      supabase
        .from("fm_reunioes")
        .select("*, cliente:fm_clientes(empresa, nome_contato)")
        .gte("data_reuniao", segunda)
        .lt("data_reuniao", fimDaSemana)
        .order("data_reuniao"),
      supabase
        .from("fm_tarefas")
        .select("*, cliente:fm_clientes(empresa, nome_contato)")
        .gte("data_prazo", segunda)
        .lt("data_prazo", fimDaSemana)
        .order("data_prazo"),
    ]);

  let consulta = supabase
    .from("fm_reunioes")
    .select("*, cliente:fm_clientes(empresa, nome_contato)")
    .order("data_reuniao", { ascending: false });

  if (q) {
    // Busca no histórico (PRD 1.2). Vírgulas/parênteses removidos porque
    // quebrariam a sintaxe do .or() do PostgREST.
    const termo = q.replace(/[,()]/g, " ").trim();
    if (termo) {
      consulta = consulta.or(
        [
          `titulo.ilike.%${termo}%`,
          `ata.ilike.%${termo}%`,
          `decisoes_tomadas.ilike.%${termo}%`,
          `proximos_passos.ilike.%${termo}%`,
          `acoes_definidas.ilike.%${termo}%`,
        ].join(","),
      );
    }
  }
  if (cliente) consulta = consulta.eq("cliente_id", cliente);

  const [{ data: reunioes }, { data: clientes }] = await Promise.all([
    consulta,
    supabase.from("fm_clientes").select("id, empresa, nome_contato").order("empresa"),
  ]);

  const lista = (reunioes ?? []) as Reuniao[];
  const listaClientes = (clientes ?? []) as Pick<
    Cliente,
    "id" | "empresa" | "nome_contato"
  >[];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Reuniões
          </h1>
          <p className="text-sm text-ink-faint">
            Histórico de atas, decisões e próximos passos
          </p>
        </div>
        <Link
          href="/reunioes/nova"
          className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
        >
          + Nova reunião
        </Link>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-ink">
          Semana de {dataBR(segunda)}
        </h2>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/reunioes?semana=${addDias(segunda, -7)}`}
            className="rounded-lg border border-divider bg-card px-3 py-1.5 text-ink-soft hover:text-ink"
          >
            ← anterior
          </Link>
          <Link
            href="/reunioes"
            className="rounded-lg border border-divider bg-card px-3 py-1.5 text-ink-soft hover:text-ink"
          >
            hoje
          </Link>
          <Link
            href={`/reunioes?semana=${addDias(segunda, 7)}`}
            className="rounded-lg border border-divider bg-card px-3 py-1.5 text-ink-soft hover:text-ink"
          >
            próxima →
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <CalendarioSemana
          segunda={segunda}
          reunioes={(reunioesSemana ?? []) as Reuniao[]}
          tarefas={(tarefasSemana ?? []) as Tarefa[]}
        />
        <p className="mt-1 text-xs text-ink-faint">
          Tarefas com prazo na semana aparecem no dia do vencimento — classifique
          cada uma na Matriz de Eisenhower pelo seletor; a matriz montada fica no
          Dashboard.
        </p>
      </div>

      {process.env.NEXT_PUBLIC_GCAL_EMBED_URL ? (
        <div className="mb-8">
          <h2 className="mb-3 font-display text-lg font-medium text-ink">
            Agenda Google
          </h2>
          <iframe
            src={process.env.NEXT_PUBLIC_GCAL_EMBED_URL}
            className="h-[480px] w-full rounded-card border-0 bg-card shadow-card"
            title="Google Calendar"
          />
        </div>
      ) : (
        <p className="mb-8 text-xs text-ink-faint">
          Para embutir a agenda do Google aqui: Google Calendar → ⚙ Configurações
          → sua agenda → &quot;Integrar agenda&quot; → copiar o endereço do iframe e colocar
          em NEXT_PUBLIC_GCAL_EMBED_URL no web/.env.local.
        </p>
      )}

      <h2 className="mb-3 font-display text-lg font-medium text-ink">
        Histórico
      </h2>
      <form method="GET" className="mb-6 flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar em títulos, atas, decisões e próximos passos…"
          className="flex-1 rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink outline-none focus:border-bronze"
        />
        <select
          name="cliente"
          defaultValue={cliente ?? ""}
          className="rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink outline-none"
        >
          <option value="">Todos os clientes</option>
          {listaClientes.map((c) => (
            <option key={c.id} value={c.id}>
              {nomeCliente(c)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-divider bg-card px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
        >
          Buscar
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {lista.map((r) => (
          <Link
            key={r.id}
            href={`/reunioes/${r.id}`}
            className="block rounded-card bg-card p-5 shadow-card transition-shadow hover:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg font-medium text-ink">
                {r.titulo}
              </h2>
              <span className={`shrink-0 text-xs font-medium ${CORES_STATUS[r.status] ?? ""}`}>
                {rotulo(STATUS_REUNIAO, r.status)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">
              {r.cliente ? nomeCliente(r.cliente) : "—"} ·{" "}
              {rotulo(TIPOS_REUNIAO, r.tipo)} · {dataHoraBR(r.data_reuniao)}
            </p>
            {r.ata && (
              <p className="mt-2 text-sm text-ink-soft">
                {r.ata.length > 180 ? `${r.ata.slice(0, 180)}…` : r.ata}
              </p>
            )}
          </Link>
        ))}
        {lista.length === 0 && (
          <div className="rounded-card bg-card p-8 text-center shadow-card">
            <p className="text-sm text-ink-faint">
              {q || cliente
                ? "Nenhuma reunião encontrada com esses filtros."
                : "Nenhuma reunião registrada ainda — crie a primeira."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
