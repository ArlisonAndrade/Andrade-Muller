-- ============================================================
-- ANDRADE & MULLER — SCHEMA FINANCEIRO
-- Módulo 1: Bank (Família + CNPJ) + Investimentos + Carteira Arthur
-- Princípio: partida dobrada leve (toda transação sabe sua origem/destino lógico)
-- ============================================================

-- ---------- ENTIDADES CONTÁBEIS ----------
-- Cada "livro" isolado: família, CNPJ, Arthur.
-- RLS depois garante que só quem tem permissão acessa cada entidade.
create table entidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                    -- 'Família Andrade&Muller', 'Smart 360 (CNPJ)', 'Carteira Arthur'
  tipo text not null check (tipo in ('familia', 'cnpj', 'carteira_infantil')),
  created_at timestamptz default now()
);

-- ---------- USUÁRIOS E ACESSO ----------
create table membros (
  id uuid primary key references auth.users(id),
  nome text not null,
  created_at timestamptz default now()
);

-- Quem acessa qual entidade (Arlison e Franciele veem família + CNPJ; Arthur não loga ainda)
create table entidade_membros (
  entidade_id uuid references entidades(id) on delete cascade,
  membro_id uuid references membros(id) on delete cascade,
  papel text default 'owner' check (papel in ('owner', 'viewer')),
  primary key (entidade_id, membro_id)
);

-- ---------- CATEGORIAS (orçamento 50/30/20) ----------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  nome text not null,                    -- 'Moradia', 'Lazer', 'Reserva', 'Imposto', 'Honorários Consultoria'
  grupo_orcamento text check (grupo_orcamento in ('essencial_50', 'liberdade_30', 'investimento_20', 'nao_aplica')),
  tipo text not null check (tipo in ('receita', 'despesa')),
  created_at timestamptz default now()
);

-- ---------- CONTAS (onde o dinheiro fisicamente está) ----------
create table contas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  nome text not null,                    -- 'Conta Corrente Itaú PJ', 'Nubank Família', 'Corretora XP - Arthur'
  tipo text check (tipo in ('corrente', 'poupanca', 'investimento', 'dinheiro')),
  saldo_inicial numeric(14,2) default 0,
  created_at timestamptz default now()
);

-- ---------- TRANSAÇÕES ----------
-- Toda transação pertence a uma entidade. Transferências entre entidades
-- (ex: distribuição de lucro CNPJ -> Família) usam transacao_vinculada_id
-- pra espelhar automaticamente dos dois lados sem lançar 2x na mão.
create table transacoes (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  conta_id uuid references contas(id),
  categoria_id uuid references categorias(id),
  descricao text not null,
  valor numeric(14,2) not null,          -- sempre positivo; o campo 'tipo' da categoria define sinal
  data date not null default current_date,
  transacao_vinculada_id uuid references transacoes(id),  -- espelho em outra entidade (ponte pró-labore)
  recorrente boolean default false,
  created_at timestamptz default now()
);
create index idx_transacoes_entidade_data on transacoes(entidade_id, data desc);

-- ---------- DÍVIDAS ----------
create table dividas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  descricao text not null,               -- 'Financiamento veículo', 'Cartão parcelado'
  valor_total numeric(14,2) not null,
  valor_pago numeric(14,2) default 0,
  taxa_juros_mensal numeric(5,4),
  parcelas_total int,
  parcelas_pagas int default 0,
  data_vencimento_proxima date,
  quitada boolean default false,
  created_at timestamptz default now()
);

-- ---------- METAS / OBJETIVOS ----------
create table metas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  titulo text not null,                  -- 'Reserva de emergência', 'Patrimônio Arthur aos 22'
  valor_alvo numeric(14,2) not null,
  valor_atual numeric(14,2) default 0,
  data_alvo date,
  status text default 'em_andamento' check (status in ('em_andamento', 'concluida', 'pausada')),
  created_at timestamptz default now()
);

-- ---------- INVESTIMENTOS (B3 — volume baixo, lançamento manual) ----------
create table ativos (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,           -- 'PETR4', 'MXRF11'
  tipo text check (tipo in ('acao', 'fii', 'tesouro', 'renda_fixa', 'outro')),
  nome text
);

create table movimentacoes_ativos (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,  -- família, CNPJ ou Arthur podem investir
  ativo_id uuid references ativos(id),
  tipo text not null check (tipo in ('compra', 'venda')),
  quantidade numeric(14,6) not null,
  preco_unitario numeric(14,4) not null,
  data date not null default current_date,
  created_at timestamptz default now()
);

-- View: posição consolidada por ativo/entidade (preço médio calculado)
create view posicao_ativos as
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

-- Cotação atual (atualizada via cron n8n/Edge Function chamando brapi.dev)
create table cotacoes_atuais (
  ativo_id uuid primary key references ativos(id),
  preco_atual numeric(14,4),
  variacao_dia_pct numeric(6,2),
  atualizado_em timestamptz default now()
);

-- ============================================================
-- Módulo 2 (adiciona depois): FM Gestão — entregas/clientes Franciele
-- Fica em entidade_tipo separado ou schema separado quando virar produto p/ clientes
-- ============================================================

-- ---------- RLS (ativar por último, depois de popular dados de teste) ----------
alter table entidades enable row level security;
alter table transacoes enable row level security;
alter table contas enable row level security;
alter table dividas enable row level security;
alter table metas enable row level security;
alter table movimentacoes_ativos enable row level security;

-- Policy exemplo: só vê transação de entidade que o membro tem acesso
create policy "acesso_transacoes_por_entidade"
on transacoes for select
using (
  entidade_id in (
    select entidade_id from entidade_membros where membro_id = auth.uid()
  )
);
-- Repetir padrão equivalente para contas, dividas, metas, movimentacoes_ativos, entidades
