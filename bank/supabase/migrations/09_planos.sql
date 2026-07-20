-- ============================================================
-- 09_planos.sql — Fase 6 do Bank novo (19/jul/2026).
-- 1) plano_patrimonio — a curva-alvo ano a ano do "plano dos R$ 6 milhões"
--    (2025→2049 a 12% a.a., aportes crescentes — números da planilha do
--    Arlison), editável pela UI.
-- 2) parametros_plano — chave/valor por entidade pros simuladores
--    (plano 6M e Carteira Arthur) guardarem sliders.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

create table if not exists plano_patrimonio (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  ano int not null check (ano between 2000 and 2100),
  aporte_planejado numeric(14,2) not null default 0, -- aporte ANUAL planejado
  valor_alvo numeric(14,2) not null,                 -- patrimônio alvo no fim do ano
  unique (entidade_id, ano)
);

alter table plano_patrimonio enable row level security;
drop policy if exists "acesso_plano_patrimonio_por_entidade" on plano_patrimonio;
create policy "acesso_plano_patrimonio_por_entidade"
on plano_patrimonio for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

create table if not exists parametros_plano (
  entidade_id uuid not null references entidades(id) on delete cascade,
  chave text not null,
  valor numeric(16,4) not null,
  atualizado_em timestamptz default now(),
  primary key (entidade_id, chave)
);

alter table parametros_plano enable row level security;
drop policy if exists "acesso_parametros_plano_por_entidade" on parametros_plano;
create policy "acesso_parametros_plano_por_entidade"
on parametros_plano for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- ---------- Seed — curva 2025→2049 da planilha (12% a.a.) ----------
insert into plano_patrimonio (entidade_id, ano, aporte_planejado, valor_alvo)
select 'b0000000-0000-0000-0000-000000000001'::uuid, v.ano, v.aporte, v.alvo
from (values
  (2025,   9500.00,    55440.00),
  (2026,  12000.00,    75532.80),
  (2027,  20000.00,   106996.74),
  (2028,  25000.00,   147836.34),
  (2029,  30000.00,   199176.71),
  (2030,  33000.00,   260037.91),
  (2031,  36000.00,   331562.46),
  (2032,  40000.00,   416149.95),
  (2033,  50000.00,   522087.95),
  (2034,  60000.00,   651938.50),
  (2035,  65000.00,   802971.12),
  (2036,  65000.00,   972127.66),
  (2037,  65000.00,  1161582.98),
  (2038,  65000.00,  1373772.93),
  (2039,  65000.00,  1611425.69),
  (2040,  65000.00,  1877596.77),
  (2041,  65000.00,  2175708.38),
  (2042,  70000.00,  2515193.39),
  (2043,  75000.00,  2901016.59),
  (2044,  80000.00,  3338738.59),
  (2045,  85000.00,  3834587.22),
  (2046,  90000.00,  4395537.68),
  (2047,  95000.00,  5029402.20),
  (2048, 100000.00,  5744930.47),
  (2049, 105000.00,  6551922.12)
) as v(ano, aporte, alvo)
where not exists (
  select 1 from plano_patrimonio p
  where p.entidade_id = 'b0000000-0000-0000-0000-000000000001'::uuid and p.ano = v.ano
);

-- ---------- Seed — parâmetros dos simuladores ----------
insert into parametros_plano (entidade_id, chave, valor)
select 'b0000000-0000-0000-0000-000000000001'::uuid, v.chave, v.valor
from (values
  ('plano6m_rentabilidade_aa', 12.0),
  ('plano6m_aporte_mensal',    1000.0)
) as v(chave, valor)
where not exists (
  select 1 from parametros_plano p
  where p.entidade_id = 'b0000000-0000-0000-0000-000000000001'::uuid and p.chave = v.chave
);

insert into parametros_plano (entidade_id, chave, valor)
select 'b0000000-0000-0000-0000-000000000003'::uuid, v.chave, v.valor
from (values
  ('arthur_aporte_mensal',       100.0),
  ('arthur_aporte_aniversario',  500.0),
  ('arthur_rentabilidade_aa',    10.0),
  ('arthur_idade_alvo',          18.0)
) as v(chave, valor)
where not exists (
  select 1 from parametros_plano p
  where p.entidade_id = 'b0000000-0000-0000-0000-000000000003'::uuid and p.chave = v.chave
);
