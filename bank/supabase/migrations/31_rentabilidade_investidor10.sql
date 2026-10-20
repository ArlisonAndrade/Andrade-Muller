-- Rentabilidade da carteira vinda do Investidor10 (20/out/2026).
--
-- A tela de investimentos calculava a rentabilidade por conta própria (lucro ÷
-- aplicado, e a de 12M pela razão mercado/aplicado entre duas fotos mensais).
-- Isso é rentabilidade sobre o custo, que encolhe sempre que entra aporte —
-- o Investidor10 mede por cotas (TWR) e a diferença ficou grande: 8,55% × 14,22%
-- em 12 meses, 11,17% × 28,51% no total. O resumo da carteira já devolve os
-- dois números (`profit_twr`, `profit_twr_12m`); a sincronização passa a
-- guardá-los no log e a página mostra o da última rodada que deu certo.

alter table sincronizacoes_investidor10
  add column if not exists rentabilidade_total numeric(10,4),
  add column if not exists rentabilidade_12m numeric(10,4);
