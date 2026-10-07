-- 28 — Aporte novo é anunciado no grupo uma vez só.
--
-- Mesmo princípio das medalhas (migration 20): a sincronização percebe o
-- aporte, o resumo do Telegram conta pra família, e a marca impede de repetir
-- no dia seguinte. Retirada não vira anúncio — e o Arlison não faz mais
-- (07/out/2026: "agora é repor com juros o que me peguei emprestado").

alter table movimentos_carteira add column if not exists anunciado_em timestamptz;

comment on column movimentos_carteira.anunciado_em is
  'Quando o aporte foi contado no grupo (lib/bank/aporte-anuncio.ts). Retiradas nascem marcadas.';

-- As retiradas que já existem (set/2026, a manobra da reserva) não se anunciam.
update movimentos_carteira set anunciado_em = now()
 where tipo = 'retirada' and anunciado_em is null;
