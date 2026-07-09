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
