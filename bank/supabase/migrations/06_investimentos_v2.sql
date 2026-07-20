-- ============================================================
-- 06_investimentos_v2.sql — Fase 2 do Bank novo (19/jul/2026).
-- 1) ativos.tipo ganha as classes reais da carteira (cripto, ETF
--    internacional, fundo de investimento).
-- 2) metas_alocacao — % alvo por classe (o "% na carteira atual vs meta"
--    do painel de investimentos).
-- 3) proventos — dividendos/JCP/rendimentos recebidos.
-- 4) snapshots_patrimonio — foto mensal (aplicado + mercado) pro gráfico
--    de evolução; upsert on-load do dashboard, cresce daqui pra frente.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

-- ---------- 1. Classes de ativo ----------
alter table ativos drop constraint if exists ativos_tipo_check;
alter table ativos add constraint ativos_tipo_check check (tipo in
  ('acao','fii','etf_internacional','fundo','tesouro','renda_fixa','cripto','outro'));

-- ---------- 2. Metas de alocação por classe ----------
create table if not exists metas_alocacao (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  classe text not null check (classe in
    ('acao','fii','etf_internacional','fundo','tesouro','renda_fixa','cripto','outro')),
  percentual_alvo numeric(5,2) not null check (percentual_alvo >= 0 and percentual_alvo <= 100),
  unique (entidade_id, classe)
);

alter table metas_alocacao enable row level security;
drop policy if exists "acesso_metas_alocacao_por_entidade" on metas_alocacao;
create policy "acesso_metas_alocacao_por_entidade"
on metas_alocacao for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- ---------- 3. Proventos ----------
create table if not exists proventos (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  ativo_id uuid references ativos(id),
  tipo text not null check (tipo in ('dividendo','jcp','rendimento','juros')),
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  created_at timestamptz default now()
);

alter table proventos enable row level security;
drop policy if exists "acesso_proventos_por_entidade" on proventos;
create policy "acesso_proventos_por_entidade"
on proventos for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- ---------- 4. Snapshots mensais de patrimônio ----------
create table if not exists snapshots_patrimonio (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  competencia date not null, -- sempre o 1º dia do mês
  valor_aplicado numeric(14,2) not null default 0, -- custo (preço médio × qtd)
  valor_mercado numeric(14,2) not null default 0,  -- cotação atual × qtd
  saldo_contas numeric(14,2) not null default 0,
  criado_em timestamptz default now(),
  unique (entidade_id, competencia)
);

alter table snapshots_patrimonio enable row level security;
drop policy if exists "acesso_snapshots_por_entidade" on snapshots_patrimonio;
create policy "acesso_snapshots_por_entidade"
on snapshots_patrimonio for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- ---------- 5. Seed — metas de alocação da carteira (Família) ----------
-- Valores reais informados pelo Arlison (painel Investidor10, jul/2026).
insert into metas_alocacao (entidade_id, classe, percentual_alvo)
select v.entidade_id, v.classe, v.percentual_alvo
from (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'acao', 15.0),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'fii', 15.0),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'renda_fixa', 20.0),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'etf_internacional', 15.0),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'cripto', 15.0),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'fundo', 15.0),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'tesouro', 5.0)
) as v(entidade_id, classe, percentual_alvo)
where not exists (
  select 1 from metas_alocacao m
  where m.entidade_id = v.entidade_id and m.classe = v.classe
);
