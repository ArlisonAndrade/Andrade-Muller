-- ============================================================
-- ANDRADE & MULLER BANK — SCHEMA BASE
-- Roda no MESMO projeto Supabase do FM Gestão (decisão original do
-- kickoff: 1 backend, N entidades isoladas por RLS — não 3 backends
-- separados). entidades/membros/entidade_membros/categorias/contas/
-- transacoes JÁ EXISTEM lá (00_base.sql + 06_financeiro_base.sql do
-- FM Gestão) — aqui usamos "if not exists" pra ficar idempotente e
-- reaproveitar exatamente essas tabelas, só completando com o que
-- falta pro Bank (dívidas, metas, investimentos B3).
-- Fonte: bank/schema.sql (kickoff 09/jul/2026)
-- ============================================================

create table if not exists entidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('familia', 'cnpj', 'carteira_infantil', 'consultoria')),
  created_at timestamptz default now()
);

create table if not exists membros (
  id uuid primary key references auth.users(id),
  nome text not null,
  created_at timestamptz default now()
);

create table if not exists entidade_membros (
  entidade_id uuid references entidades(id) on delete cascade,
  membro_id uuid references membros(id) on delete cascade,
  papel text default 'owner' check (papel in ('owner', 'viewer')),
  primary key (entidade_id, membro_id)
);

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  nome text not null,
  grupo_orcamento text check (grupo_orcamento in ('essencial_50', 'liberdade_30', 'investimento_20', 'nao_aplica')),
  tipo text not null check (tipo in ('receita', 'despesa')),
  created_at timestamptz default now()
);

create table if not exists contas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  nome text not null,
  tipo text check (tipo in ('corrente', 'poupanca', 'investimento', 'dinheiro')),
  saldo_inicial numeric(14,2) default 0,
  created_at timestamptz default now()
);

create table if not exists transacoes (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  conta_id uuid references contas(id),
  categoria_id uuid references categorias(id),
  descricao text not null,
  valor numeric(14,2) not null,
  data date not null default current_date,
  transacao_vinculada_id uuid references transacoes(id),
  recorrente boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_transacoes_entidade_data on transacoes(entidade_id, data desc);

-- ---------- Tabelas novas do Bank (não existem ainda no projeto) ----------
create table if not exists dividas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  descricao text not null,
  valor_total numeric(14,2) not null,
  valor_pago numeric(14,2) default 0,
  taxa_juros_mensal numeric(5,4),
  parcelas_total int,
  parcelas_pagas int default 0,
  data_vencimento_proxima date,
  quitada boolean default false,
  created_at timestamptz default now()
);

create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  titulo text not null,
  valor_alvo numeric(14,2) not null,
  valor_atual numeric(14,2) default 0,
  data_alvo date,
  status text default 'em_andamento' check (status in ('em_andamento', 'concluida', 'pausada')),
  created_at timestamptz default now()
);

create table if not exists ativos (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,
  tipo text check (tipo in ('acao', 'fii', 'tesouro', 'renda_fixa', 'outro')),
  nome text
);

create table if not exists movimentacoes_ativos (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  ativo_id uuid references ativos(id),
  tipo text not null check (tipo in ('compra', 'venda')),
  quantidade numeric(14,6) not null,
  preco_unitario numeric(14,4) not null,
  data date not null default current_date,
  created_at timestamptz default now()
);

create or replace view posicao_ativos as
select
  m.entidade_id,
  m.ativo_id,
  a.ticker,
  a.tipo,
  sum(case when m.tipo = 'compra' then m.quantidade else -m.quantidade end) as quantidade_atual,
  round(
    sum(case when m.tipo = 'compra' then m.quantidade * m.preco_unitario else 0 end)
    / nullif(sum(case when m.tipo = 'compra' then m.quantidade else 0 end), 0)
  , 4) as preco_medio
from movimentacoes_ativos m
join ativos a on a.id = m.ativo_id
group by m.entidade_id, m.ativo_id, a.ticker, a.tipo;

create table if not exists cotacoes_atuais (
  ativo_id uuid primary key references ativos(id),
  preco_atual numeric(14,4),
  variacao_dia_pct numeric(6,2),
  atualizado_em timestamptz default now()
);

-- ---------- RLS ----------
-- entidades/membros/entidade_membros/categorias/contas/transacoes já têm
-- RLS habilitada e políticas criadas pelo FM Gestão (00_base.sql,
-- 06_financeiro_base.sql) — não repetir aqui. Só habilitar nas tabelas novas
-- (políticas completas em 02_rls_completa.sql).
alter table dividas enable row level security;
alter table metas enable row level security;
alter table ativos enable row level security;
alter table movimentacoes_ativos enable row level security;
alter table cotacoes_atuais enable row level security;
