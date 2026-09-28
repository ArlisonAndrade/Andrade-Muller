-- ============================================================
-- 11 — Agosto/2026 pelo mês de competência, como a planilha (28/set/2026)
--
-- A planilha "Contabilidade" é por competência: cada mês tem o pró-labore,
-- as fixas e o DAS dele, e o pagamento (DAS do mês M sai em M+1) só é marcado
-- em verde na aba Fator R. O extrato OFX virou conferência de caixa e não
-- entra mais no DRE (web/app/(app)/financeiro/page.tsx), então agosto precisa
-- das próprias linhas — as do extrato de agosto pagavam contas de julho.
--
-- Valores = aba AGO26 da planilha. Seguro pra rodar mais de uma vez.
-- ============================================================

-- As recorrências da migration 10 passam a valer desde agosto.
update recorrencias
set data_inicio = '2026-08-01'
where entidade_id = 'a0000000-0000-0000-0000-00000000f001'::uuid
  and data_inicio = '2026-09-01'
  and descricao in ('Pró-Labore (Bruto)', 'Contabilidade (Mensalidade)', 'Ferramentas/Softwares');

-- Lançamentos de agosto das recorrências (o gerador só cria o mês corrente).
insert into transacoes (entidade_id, conta_id, categoria_id, descricao, valor, data, forma_pagamento, recorrente, recorrencia_id, competencia_recorrencia)
select r.entidade_id, r.conta_id, r.categoria_id, r.descricao, r.valor, '2026-08-15'::date, r.forma_pagamento, true, r.id, '2026-08-01'::date
from recorrencias r
where r.entidade_id = 'a0000000-0000-0000-0000-00000000f001'::uuid
  and r.descricao in ('Pró-Labore (Bruto)', 'Contabilidade (Mensalidade)', 'Ferramentas/Softwares')
  and not exists (
    select 1 from transacoes t
    where t.recorrencia_id = r.id and t.competencia_recorrencia = '2026-08-01'::date
  );

-- Variável de agosto na planilha: Taxas de Plataformas (Hotmart) R$ 1.090.
insert into transacoes (entidade_id, conta_id, categoria_id, descricao, valor, data)
select
  'a0000000-0000-0000-0000-00000000f001'::uuid,
  'f2000000-0000-0000-0000-000000000001'::uuid,
  'ca000000-0000-0000-0000-000000000062'::uuid,
  'Taxas de Plataformas (Hotmart)',
  1090.00,
  '2026-08-15'::date
where not exists (
  select 1 from transacoes t
  where t.entidade_id = 'a0000000-0000-0000-0000-00000000f001'::uuid
    and t.descricao = 'Taxas de Plataformas (Hotmart)' and t.data = '2026-08-15'::date
);

-- DAS de agosto: verde (pago) na aba Fator R — pago em setembro, lançado na
-- competência como jan–jul (dia 15 do próprio mês).
insert into transacoes (entidade_id, conta_id, categoria_id, descricao, valor, data)
select
  'a0000000-0000-0000-0000-00000000f001'::uuid,
  'f2000000-0000-0000-0000-000000000001'::uuid,
  'ca000000-0000-0000-0000-000000000011'::uuid,
  'DAS',
  600.00,
  '2026-08-15'::date
where not exists (
  select 1 from transacoes t
  where t.entidade_id = 'a0000000-0000-0000-0000-00000000f001'::uuid
    and t.categoria_id = 'ca000000-0000-0000-0000-000000000011'::uuid
    and t.data between '2026-08-01' and '2026-08-31'
    and t.ofx_fitid is null
);
