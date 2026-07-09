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
