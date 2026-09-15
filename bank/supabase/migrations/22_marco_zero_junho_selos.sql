-- Marco zero em junho/2026 e os selos da história (decisões do Arlison,
-- 15/set/2026).
--
-- A negociação com o BB foi em 22/06/2026: o plano conta daquele mês (a 21
-- tinha posto julho). Linha de base = foto de jun/2026. O placar do aporte
-- continua começando em out/2026 — jun–set são reorganização.
--
-- Os selos em si (Fundo do Poço 08/05/2024, Negociação com BB 22/06/2026,
-- Fim do Santander em construção) vivem no catálogo em
-- web/lib/bank/conquistas.ts e são gravados em `conquistas` pela avaliação.
-- Aqui só unificamos a jornada da home: o marco de 08/05/2024 que se chamava
-- "A virada da chave" é o mesmo dia do Fundo do Poço — uma verdade só.

insert into parametros_plano (entidade_id, chave, valor)
select entidade_id, 'plano_inicio', 202606
from snapshots_patrimonio
where entidade_id = 'b0000000-0000-0000-0000-000000000001' and competencia = '2026-06-01'
on conflict (entidade_id, chave) do update set valor = excluded.valor;

insert into parametros_plano (entidade_id, chave, valor)
select entidade_id, 'plano_valor_inicial', valor_mercado
from snapshots_patrimonio
where entidade_id = 'b0000000-0000-0000-0000-000000000001' and competencia = '2026-06-01'
on conflict (entidade_id, chave) do update set valor = excluded.valor;

update jornada_patrimonio
set marco_emoji = '🕳️', marco_titulo = 'Fundo do Poço'
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and marco_data = '2024-05-08';

-- A medalha genérica "Dívida quitada" saiu do catálogo (o Fim do Santander é
-- ela); não havia sido conquistada, mas limpa se existir.
delete from conquistas where codigo = 'divida_quitada';
