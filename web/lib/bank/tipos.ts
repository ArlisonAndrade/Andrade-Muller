export type TipoEntidade = "familia" | "cnpj" | "carteira_infantil";

export type Entidade = {
  id: string;
  nome: string;
  tipo: TipoEntidade;
};

// IDs fixos do seed (03_seed.sql) — estáveis no mesmo projeto Supabase do FM Gestão.
export const ENTIDADE_FAMILIA = "b0000000-0000-0000-0000-000000000001";
export const ENTIDADE_ARTHUR = "b0000000-0000-0000-0000-000000000003";
// A vida financeira do CNPJ fica só no FM Gestão — não é uma visão do Bank.
// Este id só é usado internamente pela ponte pró-labore (lib/acoes/pro-labore.ts),
// pra lançar a distribuição na mesma DRE/Fator R da consultoria.
export const ENTIDADE_CONSULTORIA = "a0000000-0000-0000-0000-00000000f001";

export type GrupoOrcamento =
  | "essencial_50"
  | "liberdade_30"
  | "investimento_20"
  | "nao_aplica";

export type Categoria = {
  id: string;
  entidade_id: string;
  nome: string;
  grupo_orcamento: GrupoOrcamento | null;
  tipo: "receita" | "despesa";
};

export type FormaPagamento = "debito" | "credito" | "pix" | "dinheiro" | "outro";

export type Cartao = {
  id: string;
  entidade_id: string;
  nome: string;
  limite: number | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
};

export type Transacao = {
  id: string;
  entidade_id: string;
  conta_id: string | null;
  categoria_id: string | null;
  descricao: string;
  valor: number;
  data: string;
  transacao_vinculada_id: string | null;
  recorrente: boolean;
  forma_pagamento: FormaPagamento | null;
  cartao_id: string | null;
  recorrencia_id: string | null;
  competencia_recorrencia: string | null;
  categoria?: Pick<Categoria, "nome" | "tipo" | "grupo_orcamento"> | null;
};

export type Recorrencia = {
  id: string;
  entidade_id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  conta_id: string | null;
  cartao_id: string | null;
  forma_pagamento: FormaPagamento | null;
  dia_do_mes: number;
  ativa: boolean;
  data_inicio: string;
  data_fim: string | null;
  categoria?: Pick<Categoria, "nome" | "tipo" | "grupo_orcamento"> | null;
};

export type Meta = {
  id: string;
  entidade_id: string;
  titulo: string;
  valor_alvo: number;
  valor_atual: number;
  data_alvo: string | null;
  status: "em_andamento" | "concluida" | "pausada";
};

// ---- Aba Norte (Planejamento) ----
export type Pessoa = {
  id: string;
  entidade_id: string;
  nome: string;
  cor: string | null;
  renda_base: number;
  ordem: number;
  ativo: boolean;
};

export type OrcamentoItem = {
  id: string;
  entidade_id: string;
  item: string;
  valor: number;
  categoria_id: string | null;
  grupo_orcamento: GrupoOrcamento | null;
  metodo: string | null;
  cartao_id: string | null;
  responsavel_id: string | null;
  obs: string | null;
  ordem: number;
  ativo: boolean;
};

// Rótulos do orçamento 50/30/20 (esquema do Bank, consistente com a home).
export const ROTULO_GRUPO: Record<GrupoOrcamento, string> = {
  essencial_50: "Essenciais 50%",
  liberdade_30: "Estilo de vida 30%",
  investimento_20: "Investimento 20%",
  nao_aplica: "Não se aplica",
};

export const PCT_GRUPO: Record<Exclude<GrupoOrcamento, "nao_aplica">, number> = {
  essencial_50: 0.5,
  liberdade_30: 0.3,
  investimento_20: 0.2,
};

export type PosicaoAtivo = {
  entidade_id: string;
  ativo_id: string;
  ticker: string;
  tipo: string | null;
  quantidade_atual: number;
  preco_medio: number | null;
};

export type FaturaCartao = {
  id: string;
  cartao_id: string;
  competencia: string;
  valor_total: number | null;
  paga: boolean;
  data_pagamento: string | null;
  cartao?: { nome: string } | null;
};
