-- 35 — O hash do link público da carteira, que a API do Investidor10 passou a exigir.
--
-- Desde 02/nov/2026 os endpoints internos respondem **301 "Acesso não
-- autorizado"** quando o `Referer` não é a página pública da carteira COM o
-- hash (`/wallet/public/<id>?h=<hash>`). Referer sem hash, ou só o domínio,
-- também leva 301 — é o hash que autoriza. A sincronização ficou parada desde
-- então (última rodada boa: 20/out/2026).
--
-- O hash fica no banco junto do wallet id (decisão de 14/set/2026: o id fica no
-- banco, não no código), mas `parametros_plano.valor` é numeric — daí a coluna
-- de texto.
--
-- ⚠ O VALOR NÃO ENTRA AQUI: quem tem o hash abre a carteira inteira, então ele
-- é gravado direto no banco, fora do Git. Para preencher (ou trocar, se o
-- Arlison regenerar o link no Investidor10):
--
--   update parametros_plano set valor_texto = '<h= do link público>'
--    where entidade_id = 'b0000000-0000-0000-0000-000000000001'
--      and chave = 'investidor10_wallet_hash';

alter table parametros_plano add column if not exists valor_texto text;

comment on column parametros_plano.valor_texto is
  'Parâmetro que não é número (ex.: investidor10_wallet_hash). Quando preenchido, é ele que vale.';

insert into parametros_plano (entidade_id, chave, valor, valor_texto)
values ('b0000000-0000-0000-0000-000000000001', 'investidor10_wallet_hash', 0, null)
on conflict (entidade_id, chave) do nothing;
