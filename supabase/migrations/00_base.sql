-- ============================================================
-- 00_base.sql — subconjunto do schema.sql (módulo financeiro)
-- necessário para as FKs do fm_gestao_schema.sql.
-- Estruturas idênticas às do schema.sql da raiz, com um ajuste:
-- o check de entidades.tipo ganha 'consultoria' (o schema.sql
-- ainda lista só familia/cnpj/carteira_infantil — está
-- desatualizado em relação ao fm_gestao v2, que exige
-- tipo = 'consultoria'; atualizar lá quando ele for rodado).
-- Quando o schema.sql completo entrar, trocar os create table
-- destas 3 tabelas por create table if not exists.
-- ============================================================

create table if not exists entidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                    -- 'Família Andrade&Muller', 'Smart 360 (CNPJ)', 'Carteira Arthur'
  tipo text not null check (tipo in ('familia', 'cnpj', 'carteira_infantil', 'consultoria')),
  created_at timestamptz default now()
);

-- ---------- USUÁRIOS E ACESSO ----------
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

alter table entidades enable row level security;
alter table membros enable row level security;
alter table entidade_membros enable row level security;

create policy "membro_ve_suas_entidades"
on entidades for select
using (
  id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "membro_ve_seu_perfil"
on membros for select
using (id = auth.uid());

create policy "membro_ve_seus_vinculos"
on entidade_membros for select
using (membro_id = auth.uid());

-- Entidade do módulo consultoria (id fixo para referenciar no seed)
insert into entidades (id, nome, tipo)
values ('a0000000-0000-0000-0000-00000000f001', 'FM Gestão e Estratégia', 'consultoria');

-- Vincular usuários após criarem conta no Supabase Auth (Franciele e Arlison):
-- insert into membros (id, nome)
-- select id, 'Arlison' from auth.users where email = 'arlison2012@hotmail.com';
-- insert into entidade_membros (entidade_id, membro_id, papel)
-- select 'a0000000-0000-0000-0000-00000000f001', id, 'owner' from membros;
