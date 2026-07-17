export type TipoEntidade = "familia" | "cnpj" | "carteira_infantil";

// IDs fixos do seed (bank/supabase/migrations/03_seed.sql) — mesmo projeto Supabase do bank/web.
export const ENTIDADE_FAMILIA = "b0000000-0000-0000-0000-000000000001";
export const ENTIDADE_ARTHUR = "b0000000-0000-0000-0000-000000000003";
// A vida financeira do CNPJ fica só no FM Gestão — não é uma visão do Bank.
export const ENTIDADE_CONSULTORIA = "a0000000-0000-0000-0000-00000000f001";

export type VisaoEntidade = "consolidado" | "familia";

export type GrupoOrcamento =
  | "essencial_50"
  | "liberdade_30"
  | "investimento_20"
  | "nao_aplica";

export type Transacao = {
  id: string;
  entidade_id: string;
  descricao: string;
  valor: number;
  data: string;
  transacao_vinculada_id: string | null;
  categoria?: { nome: string; tipo: "receita" | "despesa"; grupo_orcamento: GrupoOrcamento | null } | null;
};

export type Meta = {
  id: string;
  titulo: string;
  valor_alvo: number;
  valor_atual: number;
  status: "em_andamento" | "concluida" | "pausada";
};

export type PosicaoAtivo = {
  entidade_id: string;
  ativo_id: string;
  ticker: string;
  tipo: string | null;
  quantidade_atual: number;
  preco_medio: number | null;
};
