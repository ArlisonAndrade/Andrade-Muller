-- ============================================================
-- 06_financeiro_base.sql — contabilidade da consultoria,
-- espelhando a planilha real da Franciele (10/jul/2026).
-- Tabelas categorias/contas/transacoes idênticas ao schema.sql
-- do módulo financeiro (create table if not exists — quando o
-- Andrade Muller Bank rodar o schema.sql completo, reaproveita).
-- fm_faturamento continua sendo as NOTAS (receita/competência);
-- transacoes recebe impostos, despesas e destinação de lucro.
-- ============================================================

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
  valor numeric(14,2) not null,          -- sempre positivo; o tipo da categoria define o sinal
  data date not null default current_date,
  transacao_vinculada_id uuid references transacoes(id),
  recorrente boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_transacoes_entidade_data on transacoes(entidade_id, data desc);

-- Extensões FM Gestão:
-- ofx_fitid = dedupe da importação de extrato OFX
-- grupo_dre (em categorias) = linha da DRE da planilha em que a categoria entra
alter table transacoes add column if not exists ofx_fitid text;
create unique index if not exists idx_transacoes_ofx_fitid
  on transacoes(ofx_fitid) where ofx_fitid is not null;

alter table categorias add column if not exists grupo_dre text
  check (grupo_dre in ('imposto', 'cps', 'folha', 'fixa', 'variavel', 'destinacao'));

-- ---------- RLS (padrão do 02_rls_policies.sql) ----------
alter table categorias enable row level security;
alter table contas enable row level security;
alter table transacoes enable row level security;

create policy "acesso_categorias_por_entidade" on categorias for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

create policy "acesso_contas_por_entidade" on contas for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

create policy "acesso_transacoes_por_entidade" on transacoes for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- Acesso de desenvolvimento (remover junto com as dev_anon_* do 04)
create policy "dev_anon_categorias" on categorias for all to anon using (true) with check (true);
create policy "dev_anon_contas" on contas for all to anon using (true) with check (true);
create policy "dev_anon_transacoes" on transacoes for all to anon using (true) with check (true);

-- ---------- Conta e plano de categorias (linhas da planilha) ----------
insert into contas (id, entidade_id, nome, tipo) values
  ('f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000f001', 'Nubank PJ', 'corrente');

insert into categorias (id, entidade_id, nome, tipo, grupo_dre, grupo_orcamento) values
  -- receitas (a receita principal fica em fm_faturamento; estas servem p/ caixa e extras)
  ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000f001', 'Honorários de consultoria', 'receita', null, 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000f001', 'Outras receitas', 'receita', null, 'nao_aplica'),
  -- impostos sobre o faturamento
  ('ca000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-00000000f001', 'DAS (Simples Nacional)', 'despesa', 'imposto', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-00000000f001', 'ISSQN (municipal)', 'despesa', 'imposto', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-00000000f001', 'COFINS (federal)', 'despesa', 'imposto', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-00000000f001', 'PIS (federal)', 'despesa', 'imposto', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-00000000f001', 'Provisão IRPJ', 'despesa', 'imposto', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-00000000f001', 'Provisão CSLL', 'despesa', 'imposto', 'nao_aplica'),
  -- custo do serviço prestado
  ('ca000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-00000000f001', 'Custo do serviço prestado (CPS)', 'despesa', 'cps', 'nao_aplica'),
  -- folha (entra nas despesas fixas E no Fator R)
  ('ca000000-0000-0000-0000-000000000041', 'a0000000-0000-0000-0000-00000000f001', 'Pró-Labore (Bruto)', 'despesa', 'folha', 'nao_aplica'),
  -- despesas fixas
  ('ca000000-0000-0000-0000-000000000051', 'a0000000-0000-0000-0000-00000000f001', 'Contabilidade', 'despesa', 'fixa', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000052', 'a0000000-0000-0000-0000-00000000f001', 'Custo do CNPJ Patronal', 'despesa', 'fixa', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000053', 'a0000000-0000-0000-0000-00000000f001', 'Ferramentas/Softwares (fixas)', 'despesa', 'fixa', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000054', 'a0000000-0000-0000-0000-00000000f001', 'Outras despesas fixas', 'despesa', 'fixa', 'nao_aplica'),
  -- despesas variáveis
  ('ca000000-0000-0000-0000-000000000061', 'a0000000-0000-0000-0000-00000000f001', 'Marketing/Anúncios', 'despesa', 'variavel', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000062', 'a0000000-0000-0000-0000-00000000f001', 'Taxas de plataformas', 'despesa', 'variavel', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000063', 'a0000000-0000-0000-0000-00000000f001', 'Assinaturas e apps (ChatGPT, Canva…)', 'despesa', 'variavel', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000064', 'a0000000-0000-0000-0000-00000000f001', 'Juros e multas', 'despesa', 'variavel', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000065', 'a0000000-0000-0000-0000-00000000f001', 'Tarifas bancárias', 'despesa', 'variavel', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000066', 'a0000000-0000-0000-0000-00000000f001', 'Outras despesas variáveis', 'despesa', 'variavel', 'nao_aplica'),
  -- destinação de lucro
  ('ca000000-0000-0000-0000-000000000071', 'a0000000-0000-0000-0000-00000000f001', 'Reserva de Emergência (RE)', 'despesa', 'destinacao', 'nao_aplica'),
  ('ca000000-0000-0000-0000-000000000072', 'a0000000-0000-0000-0000-00000000f001', 'Pagamento de Dividendos', 'despesa', 'destinacao', 'nao_aplica');
