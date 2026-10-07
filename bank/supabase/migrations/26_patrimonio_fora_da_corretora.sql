-- 26 — Patrimônio fora da corretora: ouro físico e dinheiro em espécie.
--
-- Decisão do Arlison (07/out/2026): "o Investidor10 controla uma fonte, o Bank
-- controla toda a vida financeira da família". Ouro (joias) e os cofres entram
-- somados ao resto, com classe e cor próprias, como posição MANUAL — a
-- sincronização do Investidor10 só mexe em ativo com origem_ref 'i10:', então
-- estes nunca são sobrescritos nem apagados.
--
-- A finalidade deixa de ser só por classe: o mesmo "dinheiro em espécie" é
-- reserva de emergência (R$ 500 no cofre) e carteira do Arthur (R$ 600 no
-- cofrinho). `ativos.finalidade` sobrepõe a da classe quando preenchida.

-- 1. classes novas
alter table ativos drop constraint if exists ativos_tipo_check;
alter table ativos add constraint ativos_tipo_check check (
  tipo in ('acao','fii','etf_internacional','fundo','tesouro','renda_fixa','cripto','ouro','especie','outro')
);

-- 2. finalidade por ativo (null = usa a da classe, lib/bank/classes-ativos.ts)
alter table ativos add column if not exists finalidade text
  check (finalidade is null or finalidade in ('reserva_emergencia','arthur','investimentos'));

-- 3. a view passa a entregar finalidade e origem (a página precisa saber o que
--    é da corretora pra separar % de alocação e rentabilidade)
-- (drop antes de criar: colunas novas no meio mudariam a ordem, e o Postgres
--  recusa `create or replace view` que renomeie coluna)
drop view if exists posicao_ativos;
create view posicao_ativos as
select
  m.entidade_id,
  m.ativo_id,
  a.ticker,
  a.tipo,
  a.finalidade,
  a.origem,
  sum(case when m.tipo = 'compra' then m.quantidade else -m.quantidade end) as quantidade_atual,
  round(
    sum(case when m.tipo = 'compra' then m.quantidade * m.preco_unitario else 0 end)
    / nullif(sum(case when m.tipo = 'compra' then m.quantidade else 0 end), 0),
    4
  ) as preco_medio
from movimentacoes_ativos m
join ativos a on a.id = m.ativo_id
group by m.entidade_id, m.ativo_id, a.ticker, a.tipo, a.finalidade, a.origem;

-- 4. os três itens de hoje
insert into ativos (ticker, nome, tipo, finalidade, origem)
values
  ('ESPECIE',  'Dinheiro em espécie (cofre)', 'especie', 'reserva_emergencia', 'manual'),
  ('COFRINHO', 'Cofrinho do Arthur',          'especie', 'arthur',             'manual'),
  ('OURO',     'Ouro (joias)',                'ouro',    'investimentos',      'manual')
on conflict (ticker) do update
  set nome = excluded.nome, tipo = excluded.tipo,
      finalidade = excluded.finalidade, origem = excluded.origem;

-- Quantidade = o valor em reais nos cofres (preço 1,00), então atualizar é só
-- mexer na quantidade. No ouro a quantidade é o peso em gramas: custo de 2018
-- (R$ 7.000 ÷ 45 g) no preço médio, avaliação líquida de hoje na cotação.
insert into movimentacoes_ativos (entidade_id, ativo_id, tipo, quantidade, preco_unitario, data, origem)
select 'b0000000-0000-0000-0000-000000000001', a.id, 'compra', v.qtd, v.preco, v.data, 'manual'
from (values
  ('ESPECIE',  500::numeric, 1::numeric,        date '2026-10-07'),
  ('COFRINHO', 600::numeric, 1::numeric,        date '2026-10-07'),
  ('OURO',      45::numeric, 155.5556::numeric, date '2018-01-01')
) as v(ticker, qtd, preco, data)
join ativos a on a.ticker = v.ticker
where not exists (
  select 1 from movimentacoes_ativos m
  where m.ativo_id = a.id and m.entidade_id = 'b0000000-0000-0000-0000-000000000001'
);

insert into cotacoes_atuais (ativo_id, preco_atual, variacao_dia_pct, atualizado_em)
select a.id, v.preco, null, now()
from (values
  ('ESPECIE',  1::numeric),
  ('COFRINHO', 1::numeric),
  ('OURO',     447.3127::numeric)
) as v(ticker, preco)
join ativos a on a.ticker = v.ticker
on conflict (ativo_id) do update set preco_atual = excluded.preco_atual, atualizado_em = now();

-- 5. linha de base do plano sobe junto: o ouro e os cofres já existiam no marco
--    zero (jun/2026), então o "construído desde o marco zero" não pode saltar
--    R$ 21 mil num dia. 56.248,39 (foto da carteira) + 21.229,07.
update parametros_plano
   set valor = '77477.46'
 where entidade_id = 'b0000000-0000-0000-0000-000000000001'
   and chave = 'plano_valor_inicial';
