-- ============================================================
-- 10 — Despesas fixas da consultoria geradas todo mês (28/set/2026)
--
-- O Financeiro só enxergava o que era digitado, e a planilha da Franciele
-- repete sozinha o que é fixo. Reaproveita a tabela `recorrencias` do Bank
-- (gerador idempotente: 1 transação por recorrência por competência, ver
-- web/lib/bank/acoes/recorrencias.ts) com a entidade da consultoria.
--
-- Valores = os lançados à mão em jul/2026. Começa em set/2026: jul já está
-- lançado e ago entra pela conciliação do extrato (parte 2).
-- Seguro pra rodar mais de uma vez.
-- ============================================================

insert into recorrencias (entidade_id, descricao, valor, categoria_id, conta_id, forma_pagamento, dia_do_mes, data_inicio)
select
  'a0000000-0000-0000-0000-00000000f001'::uuid,
  v.descricao,
  v.valor,
  c.id,
  'f2000000-0000-0000-0000-000000000001'::uuid, -- Nubank PJ
  'pix',
  15,
  '2026-09-01'::date
from (values
  ('Pró-Labore (Bruto)', 3000.00, 'Pró-Labore (Bruto)'),
  ('Contabilidade (Mensalidade)', 149.00, 'Contabilidade'),
  ('Ferramentas/Softwares', 331.00, 'Ferramentas/Softwares (fixas)')
) as v(descricao, valor, categoria)
join categorias c
  on c.entidade_id = 'a0000000-0000-0000-0000-00000000f001'::uuid and c.nome = v.categoria
where not exists (
  select 1 from recorrencias r
  where r.entidade_id = 'a0000000-0000-0000-0000-00000000f001'::uuid and r.descricao = v.descricao
);
