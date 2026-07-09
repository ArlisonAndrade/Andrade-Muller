-- ============================================================
-- 00_base.sql — mínimo do schema principal do Andrade&Muller
-- necessário para as FKs do fm_gestao_schema.sql.
-- Quando o schema.sql completo do módulo financeiro entrar,
-- ele reaproveita estas tabelas (usar CREATE TABLE IF NOT EXISTS lá).
-- ============================================================

create table if not exists entidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('familia', 'cnpj', 'carteira', 'consultoria')),
  created_at timestamptz default now()
);

create table if not exists entidade_membros (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  membro_id uuid not null references auth.users(id) on delete cascade,
  papel text default 'admin',
  created_at timestamptz default now(),
  unique (entidade_id, membro_id)
);

alter table entidades enable row level security;
alter table entidade_membros enable row level security;

create policy "membro_ve_suas_entidades"
on entidades for select
using (
  id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "membro_ve_seus_vinculos"
on entidade_membros for select
using (membro_id = auth.uid());

-- Entidade do módulo consultoria (id fixo para referenciar no seed)
insert into entidades (id, nome, tipo)
values ('a0000000-0000-0000-0000-00000000f001', 'FM Gestão e Estratégia', 'consultoria');

-- Vincular usuários após criarem conta (Franciele e Arlison):
-- insert into entidade_membros (entidade_id, membro_id)
-- select 'a0000000-0000-0000-0000-00000000f001', id from auth.users where email in ('email_da_franciele', 'arlison2012@hotmail.com');
