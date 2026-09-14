-- O plano patrimonial passa a ser calculado dos parâmetros (decisão do
-- Arlison, 14/set/2026). Ver web/lib/bank/plano.ts.
--
-- A tabela plano_patrimonio guardava uma curva 2025→2049 que subia o aporte
-- 20% ao ano pra sempre (R$ 66 mil/mês em 2049, R$ 10,2 milhões no fim) e
-- cobrava R$ 174 mil em 2026 de uma carteira de R$ 58 mil. Guardar a curva
-- criava uma segunda verdade que envelhecia errado — mesma lição da jornada
-- (migration 16). Agora fases, marcos, % e aporte do mês saem só destes
-- parâmetros, editáveis em /bank/plano.
--
-- ⚠ Rodar DEPOIS da primeira sincronização com o Investidor10 (migration 18 +
-- botão): a linha de base do plano é a carteira do mês já sincronizada.

insert into parametros_plano (entidade_id, chave, valor)
select 'b0000000-0000-0000-0000-000000000001', chave, valor
from (values
  ('plano_inicio', 202610::numeric),          -- out/2026: começa limpo
  ('plano_aporte_inicial', 1000),
  ('plano_aporte_alvo', 5000),
  ('plano_rampa_fim', 202909),                -- R$ 5 mil/mês em set/2029
  ('plano_reajuste_aa', 5),
  ('plano_rentabilidade_aa', 10),
  ('plano_meta_final', 6000000),
  ('plano_ano_meta', 2049)
) as p(chave, valor)
on conflict (entidade_id, chave) do update set valor = excluded.valor;

-- Linha de base = carteira do mês corrente, já espelhada do Investidor10.
insert into parametros_plano (entidade_id, chave, valor)
select entidade_id, 'plano_valor_inicial', valor_mercado
from snapshots_patrimonio
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and competencia = date_trunc('month', current_date)::date
on conflict (entidade_id, chave) do update set valor = excluded.valor;

delete from parametros_plano
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and chave in ('plano6m_aporte_mensal', 'plano6m_rentabilidade_aa', 'plano6m_crescimento_aporte_aa');

drop table if exists plano_patrimonio;
