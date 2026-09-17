-- "Gastos Variáveis Semanais" do Planejamento passa a ser calculado da meta
-- semanal (decisão do Arlison, 17/set/2026). Antes eram dois números soltos —
-- R$ 6.000 no Planejamento e R$ 1.500/semana em /bank/semanas — que só batiam
-- por coincidência (4 × 1.500). Agora o valor da despesa é a soma das metas
-- das semanas que começam no mês (meta herdada, como em Semanas): edita-se só
-- a meta e o Planejamento acompanha. O `valor` gravado vira só o último cálculo.

alter table orcamento_planejado
  add column if not exists vinculo text check (vinculo in ('meta_semanal'));

update orcamento_planejado
set vinculo = 'meta_semanal'
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and item ilike 'gastos vari%semana%';
