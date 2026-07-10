import Link from "next/link";
import {
  QUADRANTES_EISENHOWER,
  nomeCliente,
  type Reuniao,
  type Tarefa,
} from "@/lib/tipos";
import { definirEisenhower } from "@/lib/acoes/tarefas";
import { SeletorKanban } from "@/components/crm/seletor-kanban";

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export function addDias(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const OPCOES_MATRIZ = [
  { valor: "", rotulo: "— matriz —" },
  ...QUADRANTES_EISENHOWER.map((q) => ({ valor: q.valor, rotulo: q.rotulo })),
];

export function CalendarioSemana({
  segunda,
  reunioes,
  tarefas,
}: {
  segunda: string;
  reunioes: Reuniao[];
  tarefas: Tarefa[];
}) {
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[980px] grid-cols-7 gap-2">
        {DIAS.map((nomeDia, i) => {
          const dia = addDias(segunda, i);
          const ehHoje = dia === hoje;
          const reunioesDoDia = reunioes.filter(
            (r) => r.data_reuniao.slice(0, 10) === dia,
          );
          const tarefasDoDia = tarefas.filter((t) => t.data_prazo === dia);

          return (
            <div
              key={dia}
              className={`rounded-card p-2.5 ${ehHoje ? "bg-card shadow-card" : "bg-divider/50"}`}
            >
              <p
                className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                  ehHoje ? "text-marinho" : "text-ink-faint"
                }`}
              >
                {nomeDia} {dia.slice(8, 10)}/{dia.slice(5, 7)}
                {ehHoje && " · hoje"}
              </p>

              <div className="flex flex-col gap-1.5">
                {reunioesDoDia.map((r) => (
                  <Link
                    key={r.id}
                    href={`/reunioes/${r.id}`}
                    className={`block rounded-lg bg-marinho px-2 py-1.5 text-xs text-card hover:opacity-90 ${
                      r.status === "cancelada" ? "opacity-40 line-through" : ""
                    }`}
                  >
                    <span className="font-medium">
                      {r.data_reuniao.slice(11, 16)}
                    </span>{" "}
                    {r.titulo}
                    {r.cliente && (
                      <span className="block truncate text-[10px] opacity-75">
                        {nomeCliente(r.cliente)}
                      </span>
                    )}
                  </Link>
                ))}

                {tarefasDoDia.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-divider bg-card px-2 py-1.5"
                  >
                    <Link
                      href={`/tarefas/${t.id}`}
                      className={`block text-xs hover:text-marinho ${
                        t.concluida ? "text-ink-faint line-through" : "text-ink"
                      }`}
                    >
                      {t.titulo}
                    </Link>
                    {!t.concluida && (
                      <SeletorKanban
                        valor={t.eisenhower ?? ""}
                        opcoes={OPCOES_MATRIZ}
                        aoMudar={definirEisenhower.bind(null, t.id)}
                      />
                    )}
                  </div>
                ))}

                {reunioesDoDia.length === 0 && tarefasDoDia.length === 0 && (
                  <p className="text-xs text-ink-faint/60">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
