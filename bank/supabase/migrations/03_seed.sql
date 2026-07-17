-- ============================================================
-- 03_seed.sql — entidades novas do Bank + categorias iniciais do
-- orçamento 50/30/20 (Família). IDs fixos para referência estável
-- no app. Seguro pra rodar mais de uma vez (on conflict / not exists).
--
-- O CNPJ não ganha entidade nova aqui: é a mesma consultoria que já
-- fatura no FM Gestão (entidade 'a0000000-0000-0000-0000-00000000f001',
-- tipo 'consultoria') — sua vida financeira fica só no FM Gestão. O Bank
-- só enxerga a saída de pró-labore/dividendos via ponte (transacao_vinculada_id).
-- ============================================================

insert into entidades (id, nome, tipo) values
  ('b0000000-0000-0000-0000-000000000001', 'Família Andrade&Muller', 'familia'),
  ('b0000000-0000-0000-0000-000000000003', 'Carteira Arthur', 'carteira_infantil')
on conflict (id) do nothing;

-- ---------- Categorias — Família (orçamento 50/30/20) ----------
insert into categorias (entidade_id, nome, grupo_orcamento, tipo)
select v.entidade_id, v.nome, v.grupo_orcamento, v.tipo
from (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Moradia', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Alimentação', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Transporte', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Saúde', 'essencial_50', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Lazer', 'liberdade_30', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Vestuário', 'liberdade_30', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Assinaturas', 'liberdade_30', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Reserva de emergência', 'investimento_20', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Investimentos', 'investimento_20', 'despesa'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Salário Arlison', 'nao_aplica', 'receita'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Pró-labore/Dividendos Franciele', 'nao_aplica', 'receita'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Outras rendas', 'nao_aplica', 'receita')
) as v(entidade_id, nome, grupo_orcamento, tipo)
where not exists (
  select 1 from categorias c where c.entidade_id = v.entidade_id and c.nome = v.nome
);

-- ---------- Categorias — Carteira Arthur ----------
insert into categorias (entidade_id, nome, grupo_orcamento, tipo)
select v.entidade_id, v.nome, v.grupo_orcamento, v.tipo
from (values
  ('b0000000-0000-0000-0000-000000000003'::uuid, 'Aporte', 'nao_aplica', 'receita'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, 'Rendimento', 'nao_aplica', 'receita')
) as v(entidade_id, nome, grupo_orcamento, tipo)
where not exists (
  select 1 from categorias c where c.entidade_id = v.entidade_id and c.nome = v.nome
);

-- ---------- Vincular usuários após criarem conta no Supabase Auth (Franciele e Arlison) ----------
-- Se já existir vínculo com a entidade 'consultoria' (a0000000-...-f001) do FM
-- Gestão, só falta vincular as 2 entidades novas do Bank aos mesmos membros:
-- insert into entidade_membros (entidade_id, membro_id, papel)
-- select e.id, m.id, 'owner'
-- from entidades e, membros m
-- where e.id in (
--   'b0000000-0000-0000-0000-000000000001',
--   'b0000000-0000-0000-0000-000000000003'
-- )
-- on conflict do nothing;
