-- Arquivo único: 00_base + 01_fm_gestao + 02_rls_policies + 03_seed
-- Colar inteiro no SQL Editor do Supabase e clicar em Run.

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

-- ============================================================
-- FM GESTÃO E ESTRATÉGICA — módulo consultoria Franciele
-- v2 — reconstruído a partir do Notion real ("Sistema Operacional
-- da FM Gestão Estratégica"), não mais um chute de estrutura genérica.
-- Entidade separada, mesmo projeto Supabase do Andrade&Muller.
-- Uso interno (single-tenant) — sem portal de cliente neste escopo.
-- ============================================================

-- Entidade já existe no schema principal (entidades.tipo = 'consultoria')
-- Rodar: insert into entidades (nome, tipo) values ('FM Gestão e Estratégia', 'consultoria');

-- ---------- CLIENTES (Base de dados de cliente do CRM) ----------
create table fm_clientes (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  empresa text,                          -- 'IBVET INSTITUTO BRASILEIRO DE VETERINARIA'
  nome_contato text not null,            -- pessoa de contato
  email text,
  whatsapp text,
  status text not null default 'lead' check (status in ('lead', 'prospeccao', 'proposta', 'negociacao', 'cliente_ativo', 'cliente_inativo')),
  fonte_lead text,                       -- 'Indicação', 'Rede social'
  responsavel_conta text default 'Franciele',
  tags text[],                           -- ['Estratégia de negócio', 'Consultoria de gestão', 'Liderança']
  endereco text,
  ultimo_contato date,
  observacoes text,
  created_at timestamptz default now()
);
create index idx_fm_clientes_status on fm_clientes(status);

-- ---------- FUNIL DE VENDAS (negócios/oportunidades) ----------
create table fm_negocios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  nome_negocio text not null,            -- 'Otimização da Gestão Corporativa'
  valor numeric(14,2) not null default 0,
  estagio text not null default 'prospeccao' check (estagio in ('prospeccao', 'proposta', 'negociacao', 'fechado', 'fechado_perdido')),
  data_prevista_fechamento date,
  data_fim_contrato date,
  proxima_acao text,
  proxima_acao_data date,
  risco_oportunidade text,
  created_at timestamptz default now()
);
create index idx_fm_negocios_cliente on fm_negocios(cliente_id);
create index idx_fm_negocios_estagio on fm_negocios(estagio);

-- ---------- CONTRATOS (recorrência ativa por trás do negócio fechado) ----------
create table fm_contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  negocio_id uuid references fm_negocios(id),
  tipo text not null check (tipo in ('mensal_recorrente', 'projeto_fechado', 'hora')),
  valor_mensal numeric(14,2),            -- 4000.00 para IBVET, 3500.00 para IEA
  valor_total_contrato numeric(14,2),    -- 48000.00, 42000.00
  data_inicio date not null,
  data_fim date,
  ativo boolean default true,
  created_at timestamptz default now()
);
create index idx_fm_contratos_cliente on fm_contratos(cliente_id);

-- ---------- REUNIÕES (Hub Central de Reuniões — a parte mais rica do Notion) ----------
create table fm_reunioes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  titulo text not null,
  tipo text check (tipo in ('kickoff', 'acompanhamento', 'estrategica', 'comercial', 'operacional', 'feedback')),
  status text default 'agendada' check (status in ('agendada', 'realizada', 'cancelada')),
  data_reuniao timestamptz not null,
  ata text,                              -- resumo executivo
  decisoes_tomadas text,
  proximos_passos text,
  acoes_definidas text,                  -- texto livre; itens acionáveis viram linhas em fm_tarefas
  created_at timestamptz default now()
);
create index idx_fm_reunioes_cliente_data on fm_reunioes(cliente_id, data_reuniao desc);

-- ---------- TAREFAS (Hub Central de Tarefas — pode nascer de uma reunião) ----------
create table fm_tarefas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  reuniao_origem_id uuid references fm_reunioes(id),  -- de qual reunião essa ação nasceu (se houver)
  titulo text not null,
  responsavel text,                      -- 'Franciele', 'Vicky', 'Bruna'...
  concluida boolean default false,
  prioridade text default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  data_prazo date,
  created_at timestamptz default now()
);
create index idx_fm_tarefas_cliente on fm_tarefas(cliente_id);
create index idx_fm_tarefas_prazo on fm_tarefas(data_prazo) where concluida = false;

-- ---------- FATURAMENTO / NFS-e (Financeiro & Faturamento) ----------
-- Emissão continua manual na prefeitura (decisão 09/jul/2026 — ver PRD 3.1).
-- O sistema importa a nota já emitida e calcula o resto sozinho.
create table fm_faturamento (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  contrato_id uuid references fm_contratos(id),
  numero_nfse text,                      -- 'NFS-e #030'
  valor numeric(14,2) not null,
  competencia date not null,             -- mês/ano de referência
  status text default 'pendente' check (status in ('pendente', 'concluido', 'atrasado')),
  data_emissao date,
  arquivo_origem text,                   -- caminho/URL do XML ou PDF importado (Supabase Storage)
  importado_em timestamptz,
  created_at timestamptz default now()
);
create index idx_fm_faturamento_competencia on fm_faturamento(competencia);

-- view: soma por trimestre (substitui o gráfico "Receita Mensal" do Notion)
create view fm_faturamento_trimestral as
select
  entidade_id,
  date_trunc('quarter', f.competencia) as trimestre,
  sum(f.valor) as faturamento_bruto
from fm_faturamento f
join fm_clientes c on c.id = f.cliente_id
group by entidade_id, date_trunc('quarter', f.competencia);

-- ---------- METAS / OKRs ----------
create table fm_metas_okrs (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  objetivo text not null,
  key_result text not null,
  trimestre text,                        -- '3T26'
  valor_alvo numeric(14,2),
  valor_atual numeric(14,2) default 0,
  status text default 'em_andamento' check (status in ('em_andamento', 'concluido', 'atrasado')),
  created_at timestamptz default now()
);

-- ---------- CHECKLIST DE SAÚDE OPERACIONAL (recorrente semanal) ----------
create table fm_checklist_saude (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  semana_referencia date not null,
  leads_com_proximo_contato boolean default false,
  propostas_com_followup boolean default false,
  tarefas_criticas_com_responsavel boolean default false,
  faturamento_lancado_corretamente boolean default false,
  reunioes_com_atas_documentadas boolean default false,
  created_at timestamptz default now()
);

-- ---------- VIEW: dashboard resumo por cliente (substitui a visão geral do Notion) ----------
create view fm_dashboard_clientes as
select
  c.id as cliente_id,
  c.empresa,
  c.nome_contato,
  c.status,
  ct.valor_mensal,
  ct.valor_total_contrato,
  count(t.id) filter (where t.concluida = false) as tarefas_pendentes,
  max(r.data_reuniao) filter (where r.status = 'realizada') as ultima_reuniao,
  min(t.data_prazo) filter (where t.concluida = false) as proximo_prazo
from fm_clientes c
left join fm_contratos ct on ct.cliente_id = c.id and ct.ativo = true
left join fm_tarefas t on t.cliente_id = c.id
left join fm_reunioes r on r.cliente_id = c.id
group by c.id, c.empresa, c.nome_contato, c.status, ct.valor_mensal, ct.valor_total_contrato;

-- ---------- RLS ----------
alter table fm_clientes enable row level security;
alter table fm_negocios enable row level security;
alter table fm_contratos enable row level security;
alter table fm_reunioes enable row level security;
alter table fm_tarefas enable row level security;
alter table fm_faturamento enable row level security;
alter table fm_metas_okrs enable row level security;
alter table fm_checklist_saude enable row level security;

create policy "acesso_fm_clientes_por_entidade"
on fm_clientes for select
using (
  entidade_id in (
    select entidade_id from entidade_membros where membro_id = auth.uid()
  )
);
-- Repetir padrão equivalente (via join até entidade_id) para fm_negocios, fm_contratos,
-- fm_reunioes, fm_tarefas, fm_faturamento, fm_metas_okrs, fm_checklist_saude.

-- ============================================================
-- Fora de escopo nesta versão (decisão explícita, 09/jul/2026):
-- Portal de cliente para IBVET/IEA — as contas grandes já usam
-- portal próprio delas. Se algum dia entrar, é módulo separado
-- (guest access ou app dedicado), não faz parte do MVP interno.
-- ============================================================

-- ============================================================
-- 02_rls_policies.sql — completa o padrão de RLS que o
-- fm_gestao_schema.sql define para fm_clientes (select) e
-- instrui replicar para as demais tabelas.
-- Padrão: membro da entidade tem acesso total (MVP tem um
-- único nível de permissão — PRD, seção "Usuários").
-- ============================================================

-- ---------- fm_clientes (select já existe na 01) ----------
create policy "escrita_fm_clientes_por_entidade"
on fm_clientes for insert
with check (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "update_fm_clientes_por_entidade"
on fm_clientes for update
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "delete_fm_clientes_por_entidade"
on fm_clientes for delete
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

-- ---------- tabelas com entidade_id direto ----------
create policy "acesso_fm_metas_okrs_por_entidade"
on fm_metas_okrs for all
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
)
with check (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "acesso_fm_checklist_saude_por_entidade"
on fm_checklist_saude for all
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
)
with check (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

-- ---------- tabelas que chegam na entidade via cliente_id ----------
-- fm_negocios
create policy "acesso_fm_negocios_por_entidade"
on fm_negocios for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_contratos
create policy "acesso_fm_contratos_por_entidade"
on fm_contratos for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_reunioes
create policy "acesso_fm_reunioes_por_entidade"
on fm_reunioes for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_tarefas
create policy "acesso_fm_tarefas_por_entidade"
on fm_tarefas for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_faturamento
create policy "acesso_fm_faturamento_por_entidade"
on fm_faturamento for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- ============================================================
-- 03_seed.sql — dados reais da FM Gestão (fonte: Notion + NFS-e,
-- levantamento de 09/jul/2026 no kickoff, seção 4.1).
-- Totais trimestrais são reais (4T25 R$22.760, 1T26 R$25.185,
-- 2T26 R$23.923). A quebra mensal dos tickets menores é uma
-- reconstrução plausível que fecha exatamente os totais —
-- ajustar com os números reais das NFS-e quando conferidos.
-- ============================================================

-- ---------- CLIENTES ----------
-- nome_contato de IBVET/IEA: preencher com a pessoa de contato real.
insert into fm_clientes (id, entidade_id, empresa, nome_contato, status, responsavel_conta, tags) values
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000f001',
   'IBVET INSTITUTO BRASILEIRO DE VETERINARIA', 'Contato IBVET', 'cliente_ativo', 'Franciele',
   array['Estratégia de negócio', 'Consultoria de gestão', 'Marketing', 'Comercial', 'RH', 'Eventos']),
  ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000f001',
   'IEA INSTITUTO EDUCACIONAL ARAUCARIA', 'Contato IEA', 'cliente_ativo', 'Franciele',
   array['Estratégia de negócio', 'Consultoria de gestão']),
  ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000f001',
   null, 'Juliana Azevedo Gonçalves', 'negociacao', 'Franciele',
   array['Mentoria']),
  ('c1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000f001',
   null, 'Maria Eduarda', 'cliente_ativo', 'Franciele',
   array['Mentoria']),
  ('c1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-00000000f001',
   null, 'Fernanda Senske', 'cliente_inativo', 'Franciele',
   array['Projeto']);

-- ---------- FUNIL DE VENDAS ----------
insert into fm_negocios (id, cliente_id, nome_negocio, valor, estagio, data_prevista_fechamento, data_fim_contrato, proxima_acao) values
  ('b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'Consultoria de gestão IBVET 2025/26', 48000.00, 'fechado', null, '2026-09-30', null),
  ('b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   'Renovação e reprecificação IBVET 2026/27', 48000.00, 'prospeccao', '2026-09-30', null,
   'Levantar carga de trabalho (reuniões + tarefas) x valor cobrado para sustentar reprecificação'),
  ('b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002',
   'Consultoria de gestão IEA 2025/26', 42000.00, 'fechado', null, null, null),
  ('b1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003',
   'Renovação mentoria Juliana', 120.00, 'negociacao', null, null, 'Fechar condições da renovação'),
  ('b1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004',
   'Mentoria Maria Eduarda', 0, 'fechado', null, null, null),
  ('b1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000005',
   'Projeto Fernanda Senske', 5000.00, 'fechado_perdido', null, '2026-05-31', null);

-- ---------- CONTRATOS ----------
insert into fm_contratos (id, cliente_id, negocio_id, tipo, valor_mensal, valor_total_contrato, data_inicio, data_fim, ativo) values
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 'mensal_recorrente', 4000.00, 48000.00, '2025-10-01', '2026-09-30', true),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-000000000003', 'mensal_recorrente', 3500.00, 42000.00, '2025-10-01', null, true),
  -- Juliana: R$80–120/mês variável (mentoria pontual), renovação em negociação
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003',
   'b1000000-0000-0000-0000-000000000004', 'hora', 100.00, null, '2025-10-01', null, true),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005',
   'b1000000-0000-0000-0000-000000000006', 'projeto_fechado', 1222.50, 5000.00, '2026-02-01', '2026-05-31', false);

-- ---------- FATURAMENTO (NFS-e emitidas) ----------
-- numero_nfse: preencher com os números reais ao conferir as notas.
insert into fm_faturamento (cliente_id, contrato_id, valor, competencia, status, data_emissao) values
  -- 4T25 — total R$22.760
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2025-10-01', 'concluido', '2025-10-07'),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2025-11-01', 'concluido', '2025-11-07'),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2025-12-01', 'concluido', '2025-12-05'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2025-10-01', 'concluido', '2025-10-07'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2025-11-01', 'concluido', '2025-11-07'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2025-12-01', 'concluido', '2025-12-05'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',   80.00, '2025-10-01', 'concluido', '2025-10-10'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',   90.00, '2025-11-01', 'concluido', '2025-11-10'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',   90.00, '2025-12-01', 'concluido', '2025-12-10'),
  -- 1T26 — total R$25.185
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2026-01-01', 'concluido', '2026-01-07'),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2026-02-01', 'concluido', '2026-02-06'),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2026-03-01', 'concluido', '2026-03-06'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2026-01-01', 'concluido', '2026-01-07'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2026-02-01', 'concluido', '2026-02-06'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2026-03-01', 'concluido', '2026-03-06'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',   80.00, '2026-01-01', 'concluido', '2026-01-12'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',   80.00, '2026-02-01', 'concluido', '2026-02-11'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',   80.00, '2026-03-01', 'concluido', '2026-03-11'),
  ('c1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 1222.50, '2026-02-01', 'concluido', '2026-02-10'),
  ('c1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 1222.50, '2026-03-01', 'concluido', '2026-03-10'),
  -- 2T26 — total R$23.923
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2026-04-01', 'concluido', '2026-04-07'),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2026-05-01', 'concluido', '2026-05-07'),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4000.00, '2026-06-01', 'concluido', '2026-06-05'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2026-04-01', 'concluido', '2026-04-07'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2026-05-01', 'concluido', '2026-05-07'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3500.00, '2026-06-01', 'concluido', '2026-06-05'),
  ('c1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 1222.50, '2026-04-01', 'concluido', '2026-04-10'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',  120.00, '2026-05-01', 'concluido', '2026-05-12'),
  ('c1000000-0000-0000-0000-000000000004', null,                                     80.50, '2026-06-01', 'concluido', '2026-06-15');

-- Conferência dos totais trimestrais (deve bater com os valores reais):
-- select trimestre, faturamento_bruto from fm_faturamento_trimestral order by trimestre;
-- 2025-10-01 → 22760.00 | 2026-01-01 → 25185.00 | 2026-04-01 → 23923.00
