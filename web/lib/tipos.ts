// Domínio do FM Gestão — espelha os checks do fm_gestao_schema.sql
export const ENTIDADE_ID = "a0000000-0000-0000-0000-00000000f001";

export const STATUS_CLIENTE = [
  { valor: "lead", rotulo: "Lead" },
  { valor: "prospeccao", rotulo: "Prospecção" },
  { valor: "proposta", rotulo: "Proposta" },
  { valor: "negociacao", rotulo: "Negociação" },
  { valor: "cliente_ativo", rotulo: "Cliente ativo" },
  { valor: "cliente_inativo", rotulo: "Inativo" },
] as const;

export type StatusCliente = (typeof STATUS_CLIENTE)[number]["valor"];

export const ESTAGIOS_NEGOCIO = [
  { valor: "prospeccao", rotulo: "Prospecção" },
  { valor: "proposta", rotulo: "Proposta" },
  { valor: "negociacao", rotulo: "Negociação" },
  { valor: "fechado", rotulo: "Fechado" },
  { valor: "fechado_perdido", rotulo: "Perdido" },
] as const;

export type EstagioNegocio = (typeof ESTAGIOS_NEGOCIO)[number]["valor"];

export interface Cliente {
  id: string;
  empresa: string | null;
  nome_contato: string;
  email: string | null;
  whatsapp: string | null;
  status: StatusCliente;
  fonte_lead: string | null;
  responsavel_conta: string | null;
  tags: string[] | null;
  endereco: string | null;
  ultimo_contato: string | null;
  observacoes: string | null;
}

export interface Negocio {
  id: string;
  cliente_id: string;
  nome_negocio: string;
  valor: number;
  estagio: EstagioNegocio;
  data_prevista_fechamento: string | null;
  data_fim_contrato: string | null;
  proxima_acao: string | null;
  proxima_acao_data: string | null;
  risco_oportunidade: string | null;
  cliente?: Pick<Cliente, "empresa" | "nome_contato"> | null;
}

export function nomeCliente(c: Pick<Cliente, "empresa" | "nome_contato">) {
  return c.empresa ?? c.nome_contato;
}

// ---------- Financeiro (caixa — tabelas do schema.sql financeiro) ----------
export const CONTA_PADRAO_ID = "f2000000-0000-0000-0000-000000000001"; // Nubank PJ

export type GrupoDre =
  | "imposto"
  | "cps"
  | "folha"
  | "fixa"
  | "variavel"
  | "destinacao";

export interface Categoria {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  grupo_dre?: GrupoDre | null;
}

export interface Conta {
  id: string;
  nome: string;
}

export interface Transacao {
  id: string;
  conta_id: string | null;
  categoria_id: string | null;
  descricao: string;
  valor: number;
  data: string;
  recorrente: boolean;
  ofx_fitid?: string | null;
  categoria?: Categoria | null;
  conta?: Conta | null;
}

export const TIPOS_REUNIAO = [
  { valor: "kickoff", rotulo: "Kickoff" },
  { valor: "acompanhamento", rotulo: "Acompanhamento" },
  { valor: "estrategica", rotulo: "Estratégica" },
  { valor: "comercial", rotulo: "Comercial" },
  { valor: "operacional", rotulo: "Operacional" },
  { valor: "feedback", rotulo: "Feedback" },
] as const;

export type TipoReuniao = (typeof TIPOS_REUNIAO)[number]["valor"];

export const STATUS_REUNIAO = [
  { valor: "agendada", rotulo: "Agendada" },
  { valor: "realizada", rotulo: "Realizada" },
  { valor: "cancelada", rotulo: "Cancelada" },
] as const;

export type StatusReuniao = (typeof STATUS_REUNIAO)[number]["valor"];

export interface Reuniao {
  id: string;
  cliente_id: string;
  titulo: string;
  tipo: TipoReuniao | null;
  status: StatusReuniao;
  data_reuniao: string;
  ata: string | null;
  decisoes_tomadas: string | null;
  proximos_passos: string | null;
  acoes_definidas: string | null;
  cliente?: Pick<Cliente, "empresa" | "nome_contato"> | null;
}

export const PRIORIDADES_TAREFA = [
  { valor: "baixa", rotulo: "Baixa" },
  { valor: "media", rotulo: "Média" },
  { valor: "alta", rotulo: "Alta" },
  { valor: "critica", rotulo: "Crítica" },
] as const;

export type PrioridadeTarefa = (typeof PRIORIDADES_TAREFA)[number]["valor"];

export const QUADRANTES_EISENHOWER = [
  { valor: "fazer", rotulo: "Fazer agora", descricao: "urgente + importante" },
  { valor: "agendar", rotulo: "Agendar", descricao: "importante, não urgente" },
  { valor: "delegar", rotulo: "Delegar", descricao: "urgente, não importante" },
  { valor: "eliminar", rotulo: "Eliminar", descricao: "nem urgente, nem importante" },
] as const;

export type QuadranteEisenhower =
  (typeof QUADRANTES_EISENHOWER)[number]["valor"];

export interface Tarefa {
  id: string;
  cliente_id: string;
  reuniao_origem_id: string | null;
  titulo: string;
  responsavel: string | null;
  concluida: boolean;
  prioridade: PrioridadeTarefa;
  data_prazo: string | null;
  eisenhower?: QuadranteEisenhower | null;
  cliente?: Pick<Cliente, "empresa" | "nome_contato"> | null;
}
