-- ============================================================
-- FM GESTÃO E ESTRATÉGIA — módulo consultoria Franciele
-- Entidade separada, mesmo projeto Supabase do Andrade Muller
-- ============================================================

-- Entidade já existe no schema principal (entidades.tipo = 'consultoria')
-- Rodar: insert into entidades (nome, tipo) values ('FM Gestão e Estratégia', 'consultoria');

-- ---------- CLIENTES ----------
create table fm_clientes (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  nome text not null,
  empresa text,
  contato_email text,
  contato_whatsapp text,
  status text default 'ativo' check (status in ('lead', 'ativo', 'pausado', 'encerrado')),
  data_inicio date,
  valor_contrato numeric(14,2),          -- ticket mensal ou fechado
  tipo_contrato text check (tipo_contrato in ('mensal', 'projeto_fechado', 'hora')),
  observacoes text,
  created_at timestamptz default now()
);

-- ---------- ENTREGAS (projetos/frentes de trabalho por cliente) ----------
create table fm_entregas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  titulo text not null,                  -- 'Diagnóstico Estratégico Q3', 'Plano de Ação Comercial'
  descricao text,
  status text default 'planejamento' check (status in ('planejamento', 'em_andamento', 'revisao', 'concluida', 'cancelada')),
  data_inicio date,
  data_prazo date,
  data_conclusao date,
  prioridade text default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  created_at timestamptz default now()
);
create index idx_fm_entregas_cliente on fm_entregas(cliente_id);

-- ---------- TAREFAS (checklist dentro de cada entrega) ----------
create table fm_tarefas (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid references fm_entregas(id) on delete cascade,
  titulo text not null,
  concluida boolean default false,
  responsavel text,                      -- 'Franciele' ou nome de quem executa
  data_prazo date,
  ordem int default 0,                   -- pra manter sequência no checklist
  created_at timestamptz default now()
);
create index idx_fm_tarefas_entrega on fm_tarefas(entrega_id);

-- ---------- REGISTRO DE HORAS (se algum contrato for por hora) ----------
create table fm_registro_horas (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid references fm_entregas(id) on delete cascade,
  data date not null default current_date,
  horas numeric(5,2) not null,
  descricao text,
  created_at timestamptz default now()
);

-- ---------- INTERAÇÕES/HISTÓRICO (substitui anotações soltas do Notion) ----------
create table fm_interacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  tipo text check (tipo in ('reuniao', 'whatsapp', 'email', 'observacao')),
  descricao text not null,
  data date not null default current_date,
  created_at timestamptz default now()
);

-- ---------- VIEW: dashboard resumo por cliente ----------
create view fm_dashboard_clientes as
select
  c.id as cliente_id,
  c.nome,
  c.status,
  count(e.id) filter (where e.status = 'em_andamento') as entregas_ativas,
  count(e.id) filter (where e.status = 'concluida') as entregas_concluidas,
  count(t.id) filter (where t.concluida = false) as tarefas_pendentes,
  max(e.data_prazo) filter (where e.status = 'em_andamento') as proximo_prazo
from fm_clientes c
left join fm_entregas e on e.cliente_id = c.id
left join fm_tarefas t on t.entrega_id = e.id
group by c.id, c.nome, c.status;

-- ---------- RLS ----------
alter table fm_clientes enable row level security;
alter table fm_entregas enable row level security;
alter table fm_tarefas enable row level security;

create policy "acesso_fm_por_entidade"
on fm_clientes for select
using (
  entidade_id in (
    select entidade_id from entidade_membros where membro_id = auth.uid()
  )
);
-- Repetir padrão via join para fm_entregas/fm_tarefas quando necessário
