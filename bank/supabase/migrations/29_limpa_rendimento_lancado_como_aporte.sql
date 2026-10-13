-- 29 — Tira do aporte o rendimento que entrou como se fosse aporte.
--
-- A renda fixa não muda de quantidade: aplicar e resgatar mexem no valor
-- aplicado — e o Investidor10 incorpora o rendimento nesse mesmo número. Com
-- liquidez diária e o cron rodando todo dia, cada rodada lançava alguns reais
-- de "aporte" que ninguém aportou, e o Arkad anunciava no grupo (12/out/2026:
-- R$ 1,44 no CDB Mercado Pago 105%).
--
-- A sincronização passou a descontar o rendimento já esperado desde a rodada
-- anterior (lib/bank/investidor10.ts, crescimentoEsperado). Aqui some o que a
-- regra antiga já tinha deixado para trás.

delete from movimentos_carteira m
 using ativos a
 where a.origem_ref = m.ativo_ref
   and a.tipo in ('renda_fixa', 'tesouro')
   and m.tipo = 'entrada'
   and m.valor <= 10;
