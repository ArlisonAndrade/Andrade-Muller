import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { alternarConclusao } from "@/lib/acoes/tarefas";
import { mudarStatusProjeto, excluirProjeto } from "@/lib/acoes/projetos";
import { CheckboxTarefa } from "@/components/tarefas/checkbox-tarefa";
import { SeletorKanban } from "@/components/crm/seletor-kanban";
import { BotaoExcluir } from "@/components/crm/botao-excluir";
import {
  FASES_PROJETO,
  nomeCliente,
  type Projeto,
  type Reuniao,
  type Tarefa,
} from "@/lib/tipos";
import { dataBR, dataHoraBR } from "@/lib/formato";

const OPCOES_STATUS = [
  { valor: "ativo", rotulo: "Ativo" },
  { valor: "pausado", rotulo: "Pausado" },
  { valor: "concluido", rotulo: "Concluído" },
];

export default async function DetalheProjeto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: projeto }, { data: tarefas }, { data: reunioes }] =
    await Promise.all([
      supabase
        .from("fm_projetos")
        .select("*, cliente:fm_clientes(empresa, nome_contato)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("fm_tarefas")
        .select("*")
        .eq("projeto_id", id)
        .order("data_prazo", { ascending: true, nullsFirst: false }),
      supabase
        .from("fm_reunioes")
        .select("*")
        .eq("projeto_id", id)
        .order("data_reuniao", { ascending: false }),
    ]);

  if (!projeto) notFound();
  const p = projeto as Projeto;
  const listaTarefas = (tarefas ?? []) as (Tarefa & { fase?: string | null })[];
  const listaReunioes = (reunioes ?? []) as Reuniao[];
  const hoje = new Date().toISOString().slice(0, 10);

  const feitas = listaTarefas.filter((t) => t.concluida).length;
  const pct =
    listaTarefas.length > 0 ? Math.round((feitas / listaTarefas.length) * 100) : 0;

  const porFase = new Map<string, typeof listaTarefas>();
  for (const t of listaTarefas) {
    const chave = t.fase ?? "outras";
    const grupo = porFase.get(chave) ?? [];
    grupo.push(t);
    porFase.set(chave, grupo);
  }
  const ordemFases = [
    ...FASES_PROJETO.map((f) => f.valor as string),
    "outras",
  ].filter((f) => porFase.has(f));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            {p.nome}
          </h1>
          <p className="text-sm text-ink-faint">
            {p.cliente ? nomeCliente(p.cliente) : "—"} · início{" "}
            {dataBR(p.data_inicio)}
            {p.data_fim_prevista && ` · previsão ${dataBR(p.data_fim_prevista)}`}
          </p>
        </div>
        <div className="w-36">
          <SeletorKanban
            valor={p.status}
            opcoes={OPCOES_STATUS}
            aoMudar={mudarStatusProjeto.bind(null, p.id)}
          />
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-divider">
            <div className="h-full rounded-full bg-salvia" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-display text-sm font-semibold text-ink">
            {feitas}/{listaTarefas.length} · {pct}%
          </span>
        </div>
      </Card>

      {ordemFases.map((fase) => {
        const rotulo =
          FASES_PROJETO.find((f) => f.valor === fase)?.rotulo ?? "Outras";
        const doFase = porFase.get(fase)!;
        return (
          <Card key={fase} title={rotulo} className="mb-4">
            {doFase.map((t) => {
              const atrasada = !t.concluida && !!t.data_prazo && t.data_prazo < hoje;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 border-b border-divider/50 py-2.5 last:border-0"
                >
                  <CheckboxTarefa
                    concluida={t.concluida}
                    aoAlternar={alternarConclusao.bind(null, t.id)}
                  />
                  <Link
                    href={`/tarefas/${t.id}`}
                    className={`flex-1 text-sm hover:text-marinho ${
                      t.concluida ? "text-ink-faint line-through" : "text-ink"
                    }`}
                  >
                    {t.titulo}
                  </Link>
                  <span className="w-20 text-xs text-ink-faint">{t.responsavel}</span>
                  <span
                    className={`w-24 text-right text-xs ${
                      atrasada ? "font-medium text-terracota" : "text-ink-faint"
                    }`}
                  >
                    {t.data_prazo ? dataBR(t.data_prazo) : "sem prazo"}
                    {atrasada && " ⚠"}
                  </span>
                </div>
              );
            })}
          </Card>
        );
      })}

      <Card title="Reuniões do projeto" className="mb-6">
        {listaReunioes.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Nenhuma reunião vinculada — vincule pelo formulário da reunião.
          </p>
        ) : (
          listaReunioes.map((r) => (
            <Link
              key={r.id}
              href={`/reunioes/${r.id}`}
              className="flex items-baseline justify-between border-b border-divider/50 py-2 text-sm last:border-0 hover:text-marinho"
            >
              <span className="text-ink">{r.titulo}</span>
              <span className="text-xs text-ink-faint">{dataHoraBR(r.data_reuniao)}</span>
            </Link>
          ))
        )}
      </Card>

      <div className="flex justify-end">
        <BotaoExcluir aoConfirmar={excluirProjeto.bind(null, p.id)} />
      </div>
    </div>
  );
}
