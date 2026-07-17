import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  GraficoArea,
  GraficoBarrasClientes,
  GraficoRadar,
} from "@/components/charts/graficos";
import Link from "next/link";
import {
  nomeCliente,
  QUADRANTES_EISENHOWER,
  type Cliente,
  type Tarefa,
} from "@/lib/tipos";
import { moedaBRL, mesCurto } from "@/lib/formato";
import { calcularSaude } from "@/lib/saude";

const ESTAGIOS_ABERTOS = ["prospeccao", "proposta", "negociacao"];

function corDoCliente(nome: string): "marinho" | "bronze" | "salvia" {
  if (nome.includes("IBVET")) return "marinho";
  if (nome.includes("IEA")) return "bronze";
  return "salvia";
}

export default async function Dashboard() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const competenciaAtual = `${hoje.slice(0, 7)}-01`;
  const inicioTrimestre = `${hoje.slice(0, 4)}-${String(
    Math.floor((Number(hoje.slice(5, 7)) - 1) / 3) * 3 + 1,
  ).padStart(2, "0")}-01`;
  const ha30dias = new Date(Date.now() - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    { data: faturamento },
    { data: negocios },
    { data: clientes },
    { data: tarefas },
    { data: reunioes },
    { data: contratos },
    { data: metas },
    { data: projetos },
  ] = await Promise.all([
    supabase
      .from("fm_faturamento")
      .select("valor, competencia, cliente_id, cliente:fm_clientes(empresa, nome_contato)"),
    supabase.from("fm_negocios").select("valor, estagio, proxima_acao"),
    supabase.from("fm_clientes").select("id, empresa, nome_contato, status, ultimo_contato"),
    supabase.from("fm_tarefas").select("*"),
    supabase.from("fm_reunioes").select("status, ata, data_reuniao, cliente_id"),
    supabase
      .from("fm_contratos")
      .select("cliente_id, valor_mensal, tipo")
      .eq("ativo", true),
    supabase.from("fm_metas_okrs").select("*").order("created_at"),
    supabase
      .from("fm_projetos")
      .select("*, cliente:fm_clientes(empresa, nome_contato)")
      .eq("status", "ativo")
      .order("created_at", { ascending: false }),
  ]);

  // --- Série mensal de faturamento (últimos 12 meses com lançamento) ---
  const porMes = new Map<string, number>();
  for (const f of faturamento ?? []) {
    porMes.set(f.competencia, (porMes.get(f.competencia) ?? 0) + Number(f.valor));
  }
  const meses = [...porMes.keys()].sort().slice(-12);
  const serieMensal = meses.map((m) => porMes.get(m) ?? 0);

  // --- Faturamento por cliente na mesma janela ---
  const janela = new Set(meses);
  const porCliente = new Map<string, number>();
  for (const f of faturamento ?? []) {
    if (!janela.has(f.competencia)) continue;
    const nome = f.cliente
      ? nomeCliente(f.cliente as unknown as Pick<Cliente, "empresa" | "nome_contato">)
      : "—";
    porCliente.set(nome, (porCliente.get(nome) ?? 0) + Number(f.valor));
  }
  const barrasClientes = [...porCliente.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({
      nome: nome.length > 22 ? `${nome.slice(0, 22)}…` : nome,
      valor,
      cor: corDoCliente(nome),
    }));

  // --- KPIs ---
  const fatTrimestre = (faturamento ?? [])
    .filter((f) => f.competencia >= inicioTrimestre && f.competencia <= hoje)
    .reduce((s, f) => s + Number(f.valor), 0);
  const abertos = (negocios ?? []).filter((n) => ESTAGIOS_ABERTOS.includes(n.estagio));
  const pipelineAberto = abertos.reduce((s, n) => s + Number(n.valor), 0);
  const clientesAtivos = (clientes ?? []).filter((c) => c.status === "cliente_ativo");
  const tarefasPendentes = (tarefas ?? []).filter((t) => !t.concluida);

  // --- Radar de saúde operacional: mesmas regras da página /saude ---
  const indicadores = calcularSaude({
    clientes: clientes ?? [],
    negocios: negocios ?? [],
    tarefas: tarefas ?? [],
    reunioes: reunioes ?? [],
    contratos: contratos ?? [],
    faturamento: faturamento ?? [],
    competenciaAtual,
  });
  const saude = {
    eixos: indicadores.map((i) => i.rotulo),
    valores: indicadores.map((i) => i.percentual),
  };

  // --- Carga de trabalho x valor (o relatório da reprecificação, PRD 1.7) ---
  const valorMensalPorCliente = new Map<string, number>();
  for (const c of contratos ?? []) {
    valorMensalPorCliente.set(c.cliente_id, Number(c.valor_mensal ?? 0));
  }
  const carga = clientesAtivos
    .map((c) => {
      const r = (reunioes ?? []).filter(
        (x) => x.cliente_id === c.id && x.data_reuniao >= ha30dias,
      ).length;
      const t = (tarefas ?? []).filter(
        (x) => x.cliente_id === c.id && x.created_at >= ha30dias,
      ).length;
      const valor = valorMensalPorCliente.get(c.id) ?? 0;
      return { nome: nomeCliente(c), reunioes: r, tarefas: t, valor };
    })
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
        Dashboard
      </h1>
      <p className="mb-6 text-sm text-ink-faint">
        Visão geral da FM Gestão e Estratégica
      </p>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { rotulo: "Faturamento do trimestre", valor: moedaBRL(fatTrimestre) },
          {
            rotulo: `Pipeline aberto (${abertos.length})`,
            valor: moedaBRL(pipelineAberto),
          },
          { rotulo: "Clientes ativos", valor: String(clientesAtivos.length) },
          {
            rotulo: "Tarefas pendentes",
            valor: String(tarefasPendentes.length),
          },
        ].map((kpi) => (
          <div key={kpi.rotulo} className="rounded-card bg-card p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {kpi.rotulo}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">
              {kpi.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Matriz de Eisenhower" className="col-span-2">
          {(() => {
            const pendentes = (tarefas ?? []) as Tarefa[];
            const abertas = pendentes.filter((t) => !t.concluida);
            const semClassificacao = abertas.filter((t) => !t.eisenhower);
            const COR_QUADRANTE: Record<string, string> = {
              fazer: "border-terracota/40 text-terracota",
              agendar: "border-marinho/30 text-marinho",
              delegar: "border-bronze/40 text-bronze",
              eliminar: "border-divider text-ink-faint",
            };
            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {QUADRANTES_EISENHOWER.map((qd) => {
                    const doQuadrante = abertas.filter(
                      (t) => t.eisenhower === qd.valor,
                    );
                    return (
                      <div
                        key={qd.valor}
                        className={`rounded-card border bg-parchment/50 p-4 ${COR_QUADRANTE[qd.valor]}`}
                      >
                        <p className="text-sm font-medium">
                          {qd.rotulo}{" "}
                          <span className="text-xs font-normal opacity-70">
                            · {qd.descricao}
                          </span>
                        </p>
                        <ul className="mt-2 flex flex-col gap-1">
                          {doQuadrante.slice(0, 5).map((t) => (
                            <li key={t.id}>
                              <Link
                                href={`/tarefas/${t.id}`}
                                className="text-sm text-ink hover:text-marinho"
                              >
                                {t.titulo}
                              </Link>
                            </li>
                          ))}
                          {doQuadrante.length > 5 && (
                            <li className="text-xs text-ink-faint">
                              + {doQuadrante.length - 5} tarefa(s)
                            </li>
                          )}
                          {doQuadrante.length === 0 && (
                            <li className="text-xs text-ink-faint/70">vazio</li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                {semClassificacao.length > 0 && (
                  <p className="mt-3 text-xs text-ink-faint">
                    {semClassificacao.length} tarefa(s) pendente(s) ainda sem
                    classificação —{" "}
                    <Link href="/reunioes" className="text-marinho underline">
                      classifique no calendário da semana
                    </Link>{" "}
                    ou na{" "}
                    <Link href="/tarefas" className="text-marinho underline">
                      lista de tarefas
                    </Link>
                    .
                  </p>
                )}
              </>
            );
          })()}
        </Card>

        <Card title="Tendência de faturamento" className="col-span-2">
          <GraficoArea rotulos={meses.map(mesCurto)} valores={serieMensal} />
        </Card>

        <Card title="Faturamento por cliente (12 meses)">
          {barrasClientes.length > 0 ? (
            <GraficoBarrasClientes itens={barrasClientes} />
          ) : (
            <p className="text-sm text-ink-faint">Sem lançamentos ainda.</p>
          )}
        </Card>

        <Card title="Saúde operacional (semana atual)">
          <GraficoRadar eixos={saude.eixos} valores={saude.valores} />
        </Card>

        <Card title="Metas & OKRs">
          {(metas ?? []).length === 0 ? (
            <p className="text-sm text-ink-faint">
              Nenhuma meta cadastrada — módulo de Metas chega na etapa 7.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {(metas ?? []).map((m) => {
                const progresso = m.valor_alvo
                  ? Math.min(100, Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100))
                  : 0;
                return (
                  <div key={m.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <p className="text-sm text-ink">{m.key_result}</p>
                      <span className="font-display text-sm font-semibold text-bronze">
                        {progresso}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-divider">
                      <div
                        className="h-full rounded-full bg-bronze"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Projetos em andamento">
          {(projetos ?? []).length === 0 ? (
            <p className="text-sm text-ink-faint">
              Nenhum projeto ativo —{" "}
              <Link href="/projetos/novo" className="text-marinho underline">
                criar o primeiro
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {(projetos ?? []).map((p) => {
                const doProjeto = ((tarefas ?? []) as Tarefa[]).filter(
                  (t) =>
                    (t as Tarefa & { projeto_id?: string | null }).projeto_id ===
                    p.id,
                );
                const feitas = doProjeto.filter((t) => t.concluida).length;
                const pct =
                  doProjeto.length > 0
                    ? Math.round((feitas / doProjeto.length) * 100)
                    : 0;
                const cliente = p.cliente as unknown as Pick<
                  Cliente,
                  "empresa" | "nome_contato"
                > | null;
                return (
                  <div key={p.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <Link
                        href={`/projetos/${p.id}`}
                        className="text-sm font-medium text-ink hover:text-marinho"
                      >
                        {p.nome}
                      </Link>
                      <span className="shrink-0 text-xs text-ink-faint">
                        {cliente ? nomeCliente(cliente) : "—"} · {feitas}/
                        {doProjeto.length}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-divider">
                      <div
                        className="h-full rounded-full bg-salvia"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Carga de trabalho × valor (últimos 30 dias)"
        >
          <p className="mb-3 text-xs text-ink-faint">
            Reuniões e tarefas por cliente ativo, cruzadas com a mensalidade —
            o dado que sustenta a reprecificação.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 text-right font-medium">Reuniões</th>
                <th className="py-2 pr-3 text-right font-medium">Tarefas</th>
                <th className="py-2 text-right font-medium">Mensalidade</th>
              </tr>
            </thead>
            <tbody>
              {carga.map((c) => (
                <tr key={c.nome} className="border-b border-divider/50 last:border-0">
                  <td className="py-2 pr-3 text-ink">{c.nome}</td>
                  <td className="py-2 pr-3 text-right text-ink-soft">{c.reunioes}</td>
                  <td className="py-2 pr-3 text-right text-ink-soft">{c.tarefas}</td>
                  <td className="py-2 text-right font-display font-semibold text-ink">
                    {c.valor > 0 ? moedaBRL(c.valor) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
