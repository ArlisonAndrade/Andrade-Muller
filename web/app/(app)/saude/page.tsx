import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { calcularSaude, segundaDaSemana } from "@/lib/saude";
import { registrarSemana } from "@/lib/acoes/saude";
import { dataBR } from "@/lib/formato";

interface Snapshot {
  id: string;
  semana_referencia: string;
  leads_com_proximo_contato: boolean;
  propostas_com_followup: boolean;
  tarefas_criticas_com_responsavel: boolean;
  faturamento_lancado_corretamente: boolean;
  reunioes_com_atas_documentadas: boolean;
}

const COLUNAS_HISTORICO: { chave: keyof Snapshot; rotulo: string }[] = [
  { chave: "leads_com_proximo_contato", rotulo: "Leads" },
  { chave: "propostas_com_followup", rotulo: "Follow-up" },
  { chave: "tarefas_criticas_com_responsavel", rotulo: "Críticas" },
  { chave: "faturamento_lancado_corretamente", rotulo: "Faturamento" },
  { chave: "reunioes_com_atas_documentadas", rotulo: "Atas" },
];

export default async function PaginaSaude() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const competenciaAtual = `${hoje.slice(0, 7)}-01`;

  const [clientes, negocios, tarefas, reunioes, contratos, faturamento, historico] =
    await Promise.all([
      supabase.from("fm_clientes").select("id, empresa, nome_contato, status, ultimo_contato"),
      supabase.from("fm_negocios").select("estagio, proxima_acao, nome_negocio"),
      supabase.from("fm_tarefas").select("concluida, prioridade, responsavel, titulo"),
      supabase.from("fm_reunioes").select("status, ata, titulo"),
      supabase.from("fm_contratos").select("cliente_id, tipo").eq("ativo", true),
      supabase.from("fm_faturamento").select("competencia, cliente_id"),
      supabase
        .from("fm_checklist_saude")
        .select("*")
        .order("semana_referencia", { ascending: false })
        .limit(12),
    ]);

  const indicadores = calcularSaude({
    clientes: clientes.data ?? [],
    negocios: negocios.data ?? [],
    tarefas: tarefas.data ?? [],
    reunioes: reunioes.data ?? [],
    contratos: contratos.data ?? [],
    faturamento: faturamento.data ?? [],
    competenciaAtual,
  });

  const snapshots = (historico.data ?? []) as Snapshot[];
  const semanaAtual = segundaDaSemana();
  const jaRegistrada = snapshots.some((s) => s.semana_referencia === semanaAtual);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Saúde Operacional
          </h1>
          <p className="text-sm text-ink-faint">
            Os itens do checklist do Notion, calculados automaticamente dos
            dados — não é mais formulário manual
          </p>
        </div>
        <form action={registrarSemana}>
          <button
            type="submit"
            className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            {jaRegistrada ? "Atualizar registro da semana" : "Registrar semana"}
          </button>
        </form>
      </div>

      <Card title={`Semana de ${dataBR(semanaAtual)}`}>
        <div className="flex flex-col gap-4">
          {indicadores.map((i) => (
            <div key={i.chave}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink">
                  {i.ok ? "✓" : "✗"} {i.rotulo}
                </p>
                <span
                  className={`font-display text-sm font-semibold ${i.ok ? "text-salvia" : "text-terracota"}`}
                >
                  {i.percentual}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-divider">
                <div
                  className={`h-full rounded-full ${i.ok ? "bg-salvia" : "bg-terracota"}`}
                  style={{ width: `${Math.max(i.percentual, 2)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                {i.detalhe}
                {i.pendencias.length > 0 && (
                  <span className="text-terracota">
                    {" "}
                    — pendente: {i.pendencias.join(", ")}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {snapshots.length > 0 && (
        <Card title="Histórico semanal" className="mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">Semana</th>
                {COLUNAS_HISTORICO.map((c) => (
                  <th key={c.chave} className="py-2 pr-3 text-center font-medium">
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-b border-divider/50 last:border-0">
                  <td className="py-2 pr-3 text-ink">
                    {dataBR(s.semana_referencia)}
                  </td>
                  {COLUNAS_HISTORICO.map((c) => (
                    <td key={c.chave} className="py-2 pr-3 text-center">
                      <span className={s[c.chave] ? "text-salvia" : "text-terracota"}>
                        {s[c.chave] ? "✓" : "✗"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
