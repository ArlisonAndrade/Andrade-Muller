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
  titular: string | null;
  bandeira: string | null;
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
  transferencia: boolean;
  obs: string | null;
  ordem: number;
  ativo: boolean;
};

// Rótulos do orçamento 50/30/20 no vocabulário do Notion do Arlison:
// o bucket de 50% é a Despesa Variável, o de 30% é a Despesa Fixa.
// Usado onde a % é fixa no texto (ex. seletor de grupo de um item).
export const ROTULO_GRUPO: Record<GrupoOrcamento, string> = {
  essencial_50: "Despesa Variável 50%",
  liberdade_30: "Despesa Fixa 30%",
  investimento_20: "Investimento 20%",
  nao_aplica: "Não se aplica",
};

// Nome sem a % embutida — usado onde a % é dinâmica (a divisão ativa muda
// conforme o preset escolhido, "Sua divisão hoje" na aba Norte).
export const NOME_GRUPO: Record<GrupoOrcamento, string> = {
  essencial_50: "Despesa Variável",
  liberdade_30: "Despesa Fixa",
  investimento_20: "Investimento",
  nao_aplica: "Não se aplica",
};

export const PCT_GRUPO: Record<Exclude<GrupoOrcamento, "nao_aplica">, number> = {
  essencial_50: 0.5,
  liberdade_30: 0.3,
  investimento_20: 0.2,
};

// ---- Divisão 50/30/20: presets + personalizada ----
export type PresetDivisao = "50_30_20" | "45_35_20" | "40_30_30" | "personalizada";

export type DivisaoConfig = {
  entidade_id: string;
  preset: PresetDivisao;
  pct_essencial: number;
  pct_liberdade: number;
  pct_investimento: number;
  pct_extra: number;
  extra_nome: string | null;
};

export const PRESETS_DIVISAO: {
  valor: PresetDivisao;
  nome: string;
  descricao: string;
  pct_essencial: number;
  pct_liberdade: number;
  pct_investimento: number;
}[] = [
  {
    valor: "50_30_20",
    nome: "Clássico 50/30/20",
    descricao: "O padrão que vocês já usam: metade no variável do dia a dia, 30% nas contas fixas, 20% investindo.",
    pct_essencial: 50,
    pct_liberdade: 30,
    pct_investimento: 20,
  },
  {
    valor: "45_35_20",
    nome: "Equilibrado 45/35/20",
    descricao: "Um pouco mais de fôlego pras contas fixas, mantendo o investimento em 20%.",
    pct_essencial: 45,
    pct_liberdade: 35,
    pct_investimento: 20,
  },
  {
    valor: "40_30_30",
    nome: "Investidor 40/30/30",
    descricao: "Reduz o variável pra acelerar o aporte — empurra na direção da meta dos R$ 6M.",
    pct_essencial: 40,
    pct_liberdade: 30,
    pct_investimento: 30,
  },
];

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
