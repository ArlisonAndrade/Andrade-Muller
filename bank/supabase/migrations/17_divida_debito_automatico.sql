-- Dívida paga direto na folha: a parcela é baixada sozinha no vencimento.
--
-- O Santander é consignado (decisão do Arlison, 14/set/2026): todo dia 2 a
-- parcela sai do salário antes de chegar na conta, então marcar "pagar
-- parcela" à mão é trabalho que ninguém faz — e parcela aberta depois do
-- vencimento derruba o pilar de dívida do score como se estivesse atrasada.
-- `web/lib/bank/dividas-automaticas.ts` baixa, a cada load, toda parcela
-- vencida de dívida com esta flag. Adiantamento continua manual.
alter table dividas
  add column if not exists debito_automatico boolean not null default false;

update dividas
set debito_automatico = true
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and descricao ilike '%santander%';
