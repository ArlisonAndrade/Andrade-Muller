-- A jornada patrimonial passa a calcular o futuro em vez de guardá-lo.
--
-- A 15 semeou 2021→2032 inteiro com número congelado. O passado (2021-2025)
-- continua ali: não existe transação no banco pra reconstruir aqueles anos, é
-- memória e memória se guarda escrita. Já 2026 em diante envelheceu errado nos
-- dois sentidos — dívida de R$160k contra os ~R$104k reais em aberto, e
-- quitação em 2030 contra jul/2032 do contrato que o Arlison cadastrou.
--
-- Agora `web/lib/bank/jornada.ts` monta esses anos a cada load, a partir da
-- carteira a mercado, do cronograma real de `parcelas_divida` e do aporte de
-- `parametros_plano`. Deixar as linhas antigas no banco criaria uma segunda
-- verdade sobre o mesmo dinheiro — mesma razão pela qual o n8n não escreve
-- direto no Supabase.
delete from jornada_patrimonio
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and ano >= extract(year from current_date);
