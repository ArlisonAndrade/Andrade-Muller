-- ============================================================
-- 10_norte.sql — Aba "Norte" (Planejamento) — espelha a página
-- "Orçamento Mensal" do Notion da família (Ganhos Anuais + Divisão
-- dos Pagamentos + Cartões). O Norte é o orçamento FIXO/médio a ser
-- seguido; o realizado vem de `transacoes`.
-- Idempotente (if not exists / on conflict / not exists). Roda no MESMO
-- projeto Supabase do FM Gestão, depois das migrations 00–09.
-- ============================================================

-- ---------- 1. PESSOAS (quem ganha / quem paga) ----------
-- Torna editável "salário de cada um" e "quem paga o quê". Substitui a
-- ideia fixa de renda_mensal por tipo — aqui a família cadastra as pessoas
-- e o salário-base médio, e o Norte referencia por responsavel_id.
create table if not exists pessoas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  nome text not null,
  cor text,                                   -- acento nos gráficos/badges
  renda_base numeric(14,2) not null default 0, -- salário fixo médio mensal
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz default now()
);
create unique index if not exists idx_pessoas_nome on pessoas(entidade_id, nome);

-- ---------- 2. ORCAMENTO_PLANEJADO (Divisão dos Pagamentos) ----------
-- Cada linha = um pagamento fixo/médio do mês: item, valor, categoria (Tag),
-- método (forma/cartão), grupo 20/30/50, e quem é responsável.
create table if not exists orcamento_planejado (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  item text not null,
  valor numeric(14,2) not null default 0,
  categoria_id uuid references categorias(id),
  grupo_orcamento text check (
    grupo_orcamento is null or
    grupo_orcamento in ('essencial_50','liberdade_30','investimento_20','nao_aplica')
  ),
  metodo text,                                -- espelha "Método" do Notion (Débito Automático, PIX, Boleto, Dinheiro) quando não é cartão
  cartao_id uuid references cartoes(id),
  responsavel_id uuid references pessoas(id) on delete set null,
  obs text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz default now()
);

-- ---------- 3. SEMANAS_ORCAMENTO (Gastos Semanais — usada na Fase C) ----------
-- Só a META da semana. O "Gasto Real" NÃO é coluna: é agregado de `transacoes`
-- da semana (fonte única, sem duplicar/dessincronizar).
create table if not exists semanas_orcamento (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  semana_inicio date not null,                -- segunda-feira de referência
  meta numeric(14,2) not null default 0,
  created_at timestamptz default now()
);
create unique index if not exists idx_semana_orcamento on semanas_orcamento(entidade_id, semana_inicio);

-- ---------- 4. RLS (padrão de 02_rls_completa.sql — por entidade_membros) ----------
alter table pessoas enable row level security;
alter table orcamento_planejado enable row level security;
alter table semanas_orcamento enable row level security;

drop policy if exists "acesso_pessoas_por_entidade" on pessoas;
create policy "acesso_pessoas_por_entidade" on pessoas for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_orcamento_planejado_por_entidade" on orcamento_planejado;
create policy "acesso_orcamento_planejado_por_entidade" on orcamento_planejado for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_semanas_orcamento_por_entidade" on semanas_orcamento;
create policy "acesso_semanas_orcamento_por_entidade" on semanas_orcamento for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- ---------- 5. Seed — pessoas da Família ----------
insert into pessoas (entidade_id, nome, cor, renda_base, ordem)
select v.entidade_id, v.nome, v.cor, v.renda_base, v.ordem
from (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Arlison',   '#2563eb', 0, 1),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Franciele', '#db2777', 0, 2)
) as v(entidade_id, nome, cor, renda_base, ordem)
where not exists (
  select 1 from pessoas p where p.entidade_id = v.entidade_id and p.nome = v.nome
);

-- ---------- 6. Seed — cartões que faltam (Notion: Nu Arlison, Nu Fran) ----------
-- "Cartão Carrefour" e "Cartão Nubank" já vêm do 05_lancamento_rapido.sql.
insert into cartoes (entidade_id, nome)
select v.entidade_id, v.nome
from (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Cartão Nu Arlison'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Cartão Nu Fran')
) as v(entidade_id, nome)
where not exists (
  select 1 from cartoes c where c.entidade_id = v.entidade_id and c.nome = v.nome
);

-- ---------- 7. Seed — categorias/Tags do Notion que faltam ----------
-- Alinha as "Tags" do Notion às categorias (Mercado/Assinatura/Lazer já existem).
insert into categorias (entidade_id, nome, grupo_orcamento, tipo)
select v.entidade_id, v.nome, v.grupo_orcamento, v.tipo
from (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Contas',      'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Educação',    'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Saúde',       'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Transporte',  'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Utilitários', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Dívidas',     'nao_aplica',   'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Fatura',      'nao_aplica',   'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Investimentos','investimento_20','despesa')
) as v(entidade_id, nome, grupo_orcamento, tipo)
where not exists (
  select 1 from categorias c where c.entidade_id = v.entidade_id and c.nome = v.nome
);
