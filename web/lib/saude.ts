import { diasDesde } from "@/lib/formato";

// Regras do Checklist de Saúde Operacional (PRD 1.8): o que era formulário
// semanal manual no Notion vira indicador calculado. Usado pelo radar do
// dashboard e pela página /saude — uma regra só, dois lugares.

export const DIAS_SEM_CONTATO = 14;

export function segundaDaSemana(hoje = new Date()): string {
  const d = new Date(hoje);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const STATUS_PIPELINE = ["lead", "prospeccao", "proposta", "negociacao"];
const ESTAGIOS_ABERTOS = ["prospeccao", "proposta", "negociacao"];

export interface DadosSaude {
  clientes: {
    status: string;
    ultimo_contato: string | null;
    empresa: string | null;
    nome_contato: string;
    id?: string;
  }[];
  negocios: { estagio: string; proxima_acao: string | null; nome_negocio?: string }[];
  tarefas: {
    concluida: boolean;
    prioridade: string;
    responsavel: string | null;
    titulo?: string;
  }[];
  reunioes: { status: string; ata: string | null; titulo?: string }[];
  contratos: { cliente_id: string; tipo: string }[];
  faturamento: { competencia: string; cliente_id: string }[];
  competenciaAtual: string; // "2026-07-01"
}

export interface IndicadorSaude {
  chave: string; // coluna correspondente em fm_checklist_saude
  rotulo: string;
  percentual: number;
  ok: boolean;
  detalhe: string;
  pendencias: string[];
}

function indicador(
  chave: string,
  rotulo: string,
  emDia: number,
  total: number,
  pendencias: string[],
): IndicadorSaude {
  const percentual = total === 0 ? 100 : Math.round((emDia / total) * 100);
  return {
    chave,
    rotulo,
    percentual,
    ok: percentual === 100,
    detalhe: total === 0 ? "nada a verificar" : `${emDia} de ${total} em dia`,
    pendencias,
  };
}

export function calcularSaude(d: DadosSaude): IndicadorSaude[] {
  const nome = (c: { empresa: string | null; nome_contato: string }) =>
    c.empresa ?? c.nome_contato;

  const noPipeline = d.clientes.filter((c) => STATUS_PIPELINE.includes(c.status));
  const semContato = noPipeline.filter(
    (c) => !c.ultimo_contato || diasDesde(c.ultimo_contato) >= DIAS_SEM_CONTATO,
  );

  const abertos = d.negocios.filter((n) => ESTAGIOS_ABERTOS.includes(n.estagio));
  const semFollowup = abertos.filter((n) => !n.proxima_acao);

  const criticas = d.tarefas.filter((t) => !t.concluida && t.prioridade === "critica");
  const criticasSemResp = criticas.filter((t) => !t.responsavel);

  const recorrentes = d.contratos.filter((c) => c.tipo === "mensal_recorrente");
  const lancados = new Set(
    d.faturamento
      .filter((f) => f.competencia === d.competenciaAtual)
      .map((f) => f.cliente_id),
  );
  const naoLancados = recorrentes.filter((c) => !lancados.has(c.cliente_id));
  const nomePorClienteId = new Map(
    d.clientes.filter((c) => c.id).map((c) => [c.id as string, nome(c)]),
  );

  const realizadas = d.reunioes.filter((r) => r.status === "realizada");
  const semAta = realizadas.filter((r) => !r.ata);

  return [
    indicador(
      "leads_com_proximo_contato",
      "Leads em dia",
      noPipeline.length - semContato.length,
      noPipeline.length,
      semContato.map(nome),
    ),
    indicador(
      "propostas_com_followup",
      "Follow-up de propostas",
      abertos.length - semFollowup.length,
      abertos.length,
      semFollowup.map((n) => n.nome_negocio ?? "(negócio)"),
    ),
    indicador(
      "tarefas_criticas_com_responsavel",
      "Críticas c/ responsável",
      criticas.length - criticasSemResp.length,
      criticas.length,
      criticasSemResp.map((t) => t.titulo ?? "(tarefa)"),
    ),
    indicador(
      "faturamento_lancado_corretamente",
      "Faturamento lançado",
      recorrentes.length - naoLancados.length,
      recorrentes.length,
      naoLancados.map((c) => nomePorClienteId.get(c.cliente_id) ?? "(cliente)"),
    ),
    indicador(
      "reunioes_com_atas_documentadas",
      "Atas documentadas",
      realizadas.length - semAta.length,
      realizadas.length,
      semAta.map((r) => r.titulo ?? "(reunião)"),
    ),
  ];
}
