-- ============================================================
-- 05_lancamento_rapido.sql — Fase 1 do Bank novo (19/jul/2026).
-- 1) transacoes ganha forma de pagamento + cartão (regime "dia da compra":
--    transacoes é a fonte única de verdade do orçamento; a fatura importada
--    na Fase 4 só CONFERE/vincula, nunca duplica).
-- 2) recorrencias (assinaturas e contas fixas) com geração idempotente de
--    transação por competência (reconcile on-load no app, sem cron).
-- 3) Seed das categorias reais de gasto do Arlison + cartões da família.
-- Seguro pra rodar mais de uma vez (if not exists / on conflict / not exists).
-- ============================================================

-- ---------- 1. Colunas novas em transacoes ----------
alter table transacoes add column if not exists forma_pagamento text;
alter table transacoes drop constraint if exists transacoes_forma_pagamento_check;
alter table transacoes add constraint transacoes_forma_pagamento_check
  check (forma_pagamento is null or forma_pagamento in ('debito','credito','pix','dinheiro','outro'));

alter table transacoes add column if not exists cartao_id uuid references cartoes(id);

-- ---------- 2. Recorrências ----------
create table if not exists recorrencias (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  descricao text not null,                -- 'Netflix', 'Escola Arthur'
  valor numeric(14,2) not null check (valor > 0),
  categoria_id uuid references categorias(id),
  conta_id uuid references contas(id),
  cartao_id uuid references cartoes(id),
  forma_pagamento text check (forma_pagamento is null or forma_pagamento in ('debito','credito','pix','dinheiro','outro')),
  dia_do_mes int not null check (dia_do_mes between 1 and 28), -- 1–28 evita mês curto
  ativa boolean not null default true,
  data_inicio date not null default current_date,
  data_fim date,
  created_at timestamptz default now()
);

alter table recorrencias enable row level security;

drop policy if exists "acesso_recorrencias_por_entidade" on recorrencias;
create policy "acesso_recorrencias_por_entidade"
on recorrencias for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- Vínculo transação ← recorrência: no máximo 1 transação por recorrência
-- por competência (mês) — é o que torna o reconcile on-load idempotente.
alter table transacoes add column if not exists recorrencia_id uuid references recorrencias(id) on delete set null;
alter table transacoes add column if not exists competencia_recorrencia date;
create unique index if not exists idx_transacoes_recorrencia_unica
  on transacoes (recorrencia_id, competencia_recorrencia)
  where recorrencia_id is not null;

-- ---------- 3. Seed — categorias reais de gasto (Família) ----------
-- Nomes vindos da planilha que ele usa hoje; convivem com as categorias
-- genéricas do 03_seed.sql (Moradia, Alimentação...) que podem ser
-- renomeadas/aposentadas depois pela UI.
insert into categorias (entidade_id, nome, grupo_orcamento, tipo)
select v.entidade_id, v.nome, v.grupo_orcamento, v.tipo
from (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Mercado', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Farmácia', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Combustível', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Jantar/Food', 'liberdade_30', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'E-Commerce/Compras', 'liberdade_30', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Outros', 'nao_aplica', 'despesa')
) as v(entidade_id, nome, grupo_orcamento, tipo)
where not exists (
  select 1 from categorias c where c.entidade_id = v.entidade_id and c.nome = v.nome
);
-- (Lazer e Assinaturas já existem no 03_seed.sql como liberdade_30.)

-- ---------- 4. Seed — cartões da família ----------
insert into cartoes (entidade_id, nome)
select v.entidade_id, v.nome
from (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Cartão Carrefour'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Cartão Nubank')
) as v(entidade_id, nome)
where not exists (
  select 1 from cartoes c where c.entidade_id = v.entidade_id and c.nome = v.nome
);
