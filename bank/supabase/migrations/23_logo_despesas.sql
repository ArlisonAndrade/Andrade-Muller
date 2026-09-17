-- Logo real da empresa nas despesas do Planejamento (pedido do Arlison,
-- 17/set/2026): assinatura e conta de empresa mostram a logo de verdade
-- (Netflix, Tim, Claro…); o resto continua com o ícone da categoria.
--
-- Guarda só o site (ex.: netflix.com); a imagem vem do serviço público de
-- ícones do Google a partir dele. Editável na despesa.

alter table orcamento_planejado add column if not exists logo_dominio text;

update orcamento_planejado o
set logo_dominio = v.dominio
from (values
  ('netflix', 'netflix.com'),
  ('amazon', 'amazon.com.br'),
  ('amanzon', 'amazon.com.br'),
  ('google', 'google.com'),
  ('canva', 'canva.com'),
  ('tim', 'tim.com.br'),
  ('claro', 'claro.com.br'),
  ('claude', 'claude.ai'),
  ('leiturinha', 'leiturinha.com.br'),
  ('spotify', 'spotify.com'),
  ('youtube', 'youtube.com'),
  ('disney', 'disneyplus.com'),
  ('globoplay', 'globoplay.globo.com'),
  ('icloud', 'apple.com'),
  ('apple', 'apple.com')
) as v(chave, dominio)
where o.entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and o.logo_dominio is null
  and (lower(o.item) = v.chave or lower(o.item) like v.chave || ' %');
