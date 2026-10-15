-- 30 — "Dinheiro em conta" é classe própria, e a posição manual ganha nome.
--
-- O cofrinho do Arthur tinha entrado como espécie (migration 26) mas o dinheiro
-- dele está em conta, não em cédula (correção do Arlison, 15/out/2026). São
-- coisas diferentes na prática: uma rende, a outra não, e uma está num cofre em
-- casa. As duas seguem contando como C (caixa) no ARCA.
--
-- A view passa a entregar `nome` porque a tabela expandida mostrava o ticker
-- cru ("ESPECIE") no lugar de um nome legível.

alter table ativos drop constraint if exists ativos_tipo_check;
alter table ativos add constraint ativos_tipo_check check (
  tipo in ('acao','fii','etf_internacional','fundo','tesouro','renda_fixa','cripto','ouro','especie','conta','outro')
);

drop view if exists posicao_ativos;
create view posicao_ativos as
select
  m.entidade_id,
  m.ativo_id,
  a.ticker,
  a.nome,
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
group by m.entidade_id, m.ativo_id, a.ticker, a.nome, a.tipo, a.finalidade, a.origem;

update ativos set tipo = 'conta', nome = 'Conta do Arthur' where ticker = 'COFRINHO';
update ativos set nome = 'Cofre de casa' where ticker = 'ESPECIE';
