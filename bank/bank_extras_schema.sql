-- ============================================================
-- EXTENSÕES — Ponte de renda, cartões, planejamento semanal
-- Roda em cima do schema.sql já existente
-- ============================================================

-- ---------- PONTE DE RENDA MENSAL (dia 5) ----------
-- Substitui a ideia de ledger duplo do CNPJ: aqui só registramos
-- o EVENTO de transferência, não a contabilidade completa da empresa
-- (isso já existe no sistema financeiro dela, funcionando).
create table renda_mensal (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,  -- sempre entidade Família
  competencia date not null,             -- mês de referência, ex: 2026-07-01
  tipo text not null check (tipo in ('salario_arlison', 'pro_labore_franciele', 'dividendos_franciele')),
  valor numeric(14,2) not null,
  data_recebimento date,                 -- normalmente todo dia 5
  transacao_id uuid references transacoes(id),  -- vínculo com o lançamento gerado na Família
  confirmado boolean default false,      -- checklist: já foi lançado esse mês?
  created_at timestamptz default now()
);
create unique index idx_renda_mensal_competencia on renda_mensal(entidade_id, competencia, tipo);

-- ---------- CARTÕES DE CRÉDITO ----------
create table cartoes (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  nome text not null,                    -- 'Nubank Ultravioleta', 'Inter Família'
  limite numeric(14,2),
  dia_fechamento int check (dia_fechamento between 1 and 31),
  dia_vencimento int check (dia_vencimento between 1 and 31),
  created_at timestamptz default now()
);

create table faturas_cartao (
  id uuid primary key default gen_random_uuid(),
  cartao_id uuid references cartoes(id) on delete cascade,
  competencia date not null,             -- mês de referência da fatura
  valor_total numeric(14,2),
  paga boolean default false,
  data_pagamento date,
  created_at timestamptz default now()
);
create unique index idx_fatura_competencia on faturas_cartao(cartao_id, competencia);

create table lancamentos_cartao (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid references faturas_cartao(id) on delete cascade,
  categoria_id uuid references categorias(id),
  descricao text not null,
  valor numeric(14,2) not null,
  parcela_atual int default 1,
  parcela_total int default 1,
  data date not null default current_date,
  created_at timestamptz default now()
);

-- ---------- PLANEJAMENTO SEMANAL ----------
-- Checklist leve, não é financeiro puro — é rotina (conferir fatura, aporte, revisão)
create table planejamento_semanal (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  semana_inicio date not null,           -- segunda-feira de referência
  item text not null,                    -- 'Confirmar pró-labore do mês', 'Revisar fatura Nubank'
  concluido boolean default false,
  ordem int default 0,
  created_at timestamptz default now()
);

-- ---------- REGRAS DE CATEGORIZAÇÃO AUTOMÁTICA (import OFX/CSV) ----------
-- Casa o texto do estabelecimento (ex: "IFOOD", "POSTO SHELL") com uma categoria.
-- Alimenta a sugestão automática no momento do import; o que não casar
-- fica marcado como pendente para categorização manual.
create table regras_categorizacao (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  padrao_texto text not null,            -- 'IFOOD', 'UBER', 'POSTO' — case-insensitive, match parcial
  categoria_id uuid references categorias(id),
  prioridade int default 0,              -- regras mais específicas com prioridade maior
  created_at timestamptz default now()
);

-- Import bruto antes da conciliação: guarda o arquivo original processado
-- e o status de cada linha, pra você revisar antes de confirmar a fatura
create table importacoes_fatura (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid references faturas_cartao(id) on delete cascade,
  nome_arquivo text,
  total_linhas int,
  linhas_categorizadas int default 0,
  linhas_pendentes int default 0,
  status text default 'processando' check (status in ('processando', 'revisao', 'confirmada')),
  created_at timestamptz default now()
);

-- Adiciona rastreio de origem no lançamento (import automático vs ajuste manual)
alter table lancamentos_cartao add column origem text default 'manual' check (origem in ('manual', 'import_ofx', 'import_csv'));
alter table lancamentos_cartao add column categorizado_automaticamente boolean default false;

-- ---------- RLS ----------
alter table renda_mensal enable row level security;
alter table cartoes enable row level security;
alter table faturas_cartao enable row level security;
alter table planejamento_semanal enable row level security;

create policy "acesso_renda_mensal_por_entidade"
on renda_mensal for select
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));
