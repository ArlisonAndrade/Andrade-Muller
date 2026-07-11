-- ============================================================
-- 08_projetos_analise.sql — Projetos (clientes micro) +
-- Biblioteca de Templates de Tarefas (migrada do Notion) +
-- campos da análise de reunião por IA (11/jul/2026).
-- ============================================================

-- ---------- PROJETOS (consultoria individual / micro) ----------
create table if not exists fm_projetos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references fm_clientes(id) on delete cascade,
  nome text not null,
  descricao text,
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'concluido')),
  data_inicio date not null default current_date,
  data_fim_prevista date,
  created_at timestamptz default now()
);
create index if not exists idx_fm_projetos_cliente on fm_projetos(cliente_id);

-- ---------- BIBLIOTECA DE TEMPLATES DE TAREFAS ----------
create table if not exists fm_templates_tarefas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid references entidades(id) on delete cascade,
  nome text not null,
  categoria text,
  descricao text,
  exemplo_uso text,
  fase text not null default 'execucao' check (fase in ('onboarding', 'diagnostico', 'planejamento', 'execucao', 'encerramento')),
  prazo_dias int not null default 7,          -- dias a partir do início do projeto
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- ---------- Extensões em tarefas e reuniões ----------
alter table fm_tarefas add column if not exists projeto_id uuid references fm_projetos(id) on delete set null;
alter table fm_tarefas add column if not exists fase text;
alter table fm_reunioes add column if not exists projeto_id uuid references fm_projetos(id) on delete set null;
alter table fm_reunioes add column if not exists texto_original text;      -- resumo/transcrição colado
alter table fm_reunioes add column if not exists relatorio_analise text;   -- análise gerada pela IA

-- ---------- RLS ----------
alter table fm_projetos enable row level security;
alter table fm_templates_tarefas enable row level security;

create policy "acesso_fm_projetos_por_entidade" on fm_projetos for all
using (cliente_id in (select id from fm_clientes where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())))
with check (cliente_id in (select id from fm_clientes where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())));

create policy "acesso_fm_templates_por_entidade" on fm_templates_tarefas for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- Acesso de desenvolvimento (remover junto com as dev_anon_* do 04)
create policy "dev_anon_fm_projetos" on fm_projetos for all to anon using (true) with check (true);
create policy "dev_anon_fm_templates" on fm_templates_tarefas for all to anon using (true) with check (true);

-- ---------- Seed: Biblioteca migrada do Notion (12 templates) ----------
insert into fm_templates_tarefas (entidade_id, nome, categoria, descricao, exemplo_uso, fase, prazo_dias, prioridade) values
  ('a0000000-0000-0000-0000-00000000f001', 'Assinatura de Contrato', 'Onboarding Cliente', 'Processo via Gov.br e upload no portal do cliente.', 'Primeira etapa após aprovação da proposta com o cliente.', 'onboarding', 1, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Conhecer o Portal do Cliente', 'Onboarding Cliente', 'Tour pelo sistema e liberação de acessos para o cliente.', 'Após criar/configurar portal, antes de dar acesso completo.', 'onboarding', 2, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Desenvolver Perguntas para Pesquisa', 'Projeto Estratégico', 'Estruturar e validar perguntas de pesquisa para coleta de dados qualitativa.', 'Preparação de pesquisas e entrevistas estruturadas.', 'execucao', 3, 'media'),
  ('a0000000-0000-0000-0000-00000000f001', 'Definir Indicadores-Chave de Desempenho', 'Projeto Estratégico', 'Estabelecer KPIs para monitoramento dos objetivos do cliente.', 'Após alinhamento de expectativas e plano de ação.', 'execucao', 3, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Avaliar Eficiência Operacional', 'Projeto Estratégico', 'Análise da eficiência operacional e processos do cliente.', 'Diagnósticos de operações e implementação de melhorias.', 'execucao', 10, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Conduzir Análise de Mercado', 'Projeto Estratégico', 'Pesquisa e análise do mercado e ambiente competitivo do cliente.', 'Diagnósticos 360 e projetos de estratégia competitiva.', 'execucao', 14, 'media'),
  ('a0000000-0000-0000-0000-00000000f001', 'Desenvolver Estratégias de Redução de Custos', 'Projeto Estratégico', 'Identificar oportunidades de redução de custos e otimização de despesas.', 'Projetos de otimização e eficiência operacional.', 'execucao', 14, 'media'),
  ('a0000000-0000-0000-0000-00000000f001', 'Melhorar Fontes de Receita', 'Projeto Estratégico', 'Identificar e implementar melhorias nas fontes de receita do cliente.', 'Projetos de estratégia de crescimento e receita.', 'execucao', 21, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Interpretar os Resultados', 'Projeto Estratégico', 'Análise e interpretação dos resultados obtidos durante execução.', 'Fase final de análise, antes de encerramento.', 'encerramento', 5, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Relatório final de resultados', 'Encerramento Cliente', 'Consolidar todos os entregáveis e apresentar resultados obtidos durante o engajamento.', 'Final de todo contrato de 6 meses. Base para renovação.', 'encerramento', 150, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Apresentação de encerramento', 'Encerramento Cliente', 'Reunião final para apresentar resultados e discutir continuidade.', 'Última reunião do engajamento atual. Porta de entrada para renovação.', 'encerramento', 165, 'alta'),
  ('a0000000-0000-0000-0000-00000000f001', 'Proposta de renovação', 'Encerramento Cliente', 'Preparar e enviar proposta comercial para renovação do contrato.', 'Se o cliente demonstrar interesse em continuar. Pode virar novo engajamento.', 'encerramento', 170, 'alta');
