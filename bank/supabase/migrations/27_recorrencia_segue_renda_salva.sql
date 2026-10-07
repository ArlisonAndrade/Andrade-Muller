-- 27 — Salário gerado pelo valor que está salvo no Planejamento.
--
-- Havia duas verdades sobre o mesmo salário: `renda_mensal` (o que o Arlison
-- edita em /bank/norte e que o Planejamento, o score e a divisão usam) e as
-- recorrências "Salário Arlison" / "Renda Franciele", congeladas nos valores de
-- ago/2026. A recorrência é que vira transação — e foi dela que o Arkad tirou
-- o "caiu hoje: R$ 9.500 e R$ 6.500" de 05/out/2026, com a Franciele em 6.500
-- quando o Planejamento já dizia 8.500.
--
-- Opção (a), escolhida pelo Arlison em 07/out/2026: a recorrência continua
-- gerando o lançamento, mas pelo valor salvo do mês (herdando do último mês
-- salvo, igual ao resto do Bank — lib/bank/renda.ts).

alter table recorrencias add column if not exists vinculo_renda text
  check (vinculo_renda is null or vinculo_renda in ('salario_arlison','pro_labore_franciele'));

comment on column recorrencias.vinculo_renda is
  'Quando preenchida, o valor do lançamento vem de renda_mensal deste tipo (lib/bank/acoes/recorrencias.ts), não da coluna valor.';

update recorrencias set vinculo_renda = 'salario_arlison'
 where entidade_id = 'b0000000-0000-0000-0000-000000000001' and descricao = 'Salário Arlison';

update recorrencias set vinculo_renda = 'pro_labore_franciele'
 where entidade_id = 'b0000000-0000-0000-0000-000000000001' and descricao = 'Renda Franciele';

-- Outubro já tinha sido gerado com o valor velho da Franciele (R$ 6.500) no
-- dia 5; o Planejamento diz 8.500. A partir daqui a geração se corrige
-- sozinha, mas a transação deste mês não voltaria atrás.
update transacoes t
   set valor = rm.valor
  from recorrencias r
  join renda_mensal rm
    on rm.entidade_id = r.entidade_id
   and rm.tipo = r.vinculo_renda
 where t.recorrencia_id = r.id
   and r.vinculo_renda is not null
   and rm.competencia = t.competencia_recorrencia
   and t.valor <> rm.valor;
