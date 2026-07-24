-- ============================================================
-- 11_norte_seed.sql — Popula a aba Norte com os dados REAIS do Notion
-- (página "Orçamento Mensal": Ganhos Anuais + Divisão dos Pagamentos),
-- puxados em 24/jul/2026. Roda depois da 10_norte.sql.
-- Idempotente: salários só entram se ainda estiverem zerados; itens só
-- entram se ainda não existir um com o mesmo nome.
-- ============================================================

-- ---------- Salários (jul/2026: Arlison 9.500 + Franciele 6.500 = 16.000) ----------
update pessoas set renda_base = 9500
  where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Arlison' and renda_base = 0;
update pessoas set renda_base = 6500
  where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Franciele' and renda_base = 0;

-- "Franciele Transfere" é um responsável do Notion (ela transfere pra pagar),
-- sem renda própria — entra como pessoa pra o agrupamento bater com o Notion.
insert into pessoas (entidade_id, nome, cor, renda_base, ordem)
select 'b0000000-0000-0000-0000-000000000001', 'Franciele Transfere', '#f59e0b', 0, 3
where not exists (
  select 1 from pessoas
  where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Franciele Transfere'
);

-- ---------- Categorias/Tags que faltavam pro seed casar ----------
insert into categorias (entidade_id, nome, grupo_orcamento, tipo)
select 'b0000000-0000-0000-0000-000000000001', v.nome, v.g, 'despesa'
from (values ('Assinaturas', 'liberdade_30'), ('Semanal', 'essencial_50')) as v(nome, g)
where not exists (
  select 1 from categorias c
  where c.entidade_id = 'b0000000-0000-0000-0000-000000000001' and c.nome = v.nome
);

-- ---------- Divisão dos Pagamentos (25 itens do Notion) ----------
-- v.tag já é o NOME da categoria no Bank; v.metodo é o "Método" cru do Notion
-- (quando começa com "Cartão " vira cartao_id + metodo='Cartão').
insert into orcamento_planejado
  (entidade_id, item, valor, categoria_id, grupo_orcamento, metodo, cartao_id, responsavel_id, ordem)
select
  'b0000000-0000-0000-0000-000000000001',
  v.item,
  v.valor,
  (select id from categorias c
     where c.entidade_id = 'b0000000-0000-0000-0000-000000000001' and c.nome = v.tag limit 1),
  v.grupo,
  case when v.metodo like 'Cartão %' then 'Cartão'
       when v.metodo = '' then null
       else v.metodo end,
  case when v.metodo like 'Cartão %'
       then (select id from cartoes ca
               where ca.entidade_id = 'b0000000-0000-0000-0000-000000000001' and ca.nome = v.metodo limit 1)
       else null end,
  (select id from pessoas p
     where p.entidade_id = 'b0000000-0000-0000-0000-000000000001' and p.nome = v.responsavel limit 1),
  v.ordem
from (values
  ('Natação do Arthur',        165.00, 'Saúde',         'Cartão Carrefour',   'investimento_20', 'Franciele Transfere',  1),
  ('Clube',                    160.00, 'Contas',        'Débito Automático',  'liberdade_30',    'Franciele Transfere',  2),
  ('Tim',                      155.00, 'Contas',        'Débito Automático',  'liberdade_30',    'Arlison',              3),
  ('TV',                        30.00, 'Contas',        'PIX',                'liberdade_30',    'Arlison',              4),
  ('Tennis',                    75.00, 'Saúde',         'PIX',                'liberdade_30',    'Franciele',            5),
  ('Gastos Variáveis Semanais',6000.00,'Semanal',       'Cartão Carrefour',   'essencial_50',    'Arlison',              6),
  ('Aportes',                 1000.00, 'Investimentos', 'PIX',                'investimento_20', 'Franciele Transfere',  7),
  ('Escola do Arthur',        1300.00, 'Educação',      'Boleto',             'investimento_20', 'Franciele Transfere',  8),
  ('Netflix',                   73.00, 'Assinaturas',   'Débito Automático',  'liberdade_30',    'Arlison',              9),
  ('Aluguel Mãe',              450.00, 'Contas',        'Boleto',             'liberdade_30',    'Arlison',             10),
  ('Leiturinha',                55.00, 'Assinaturas',   'Cartão Carrefour',   'liberdade_30',    'Arlison',             11),
  ('Claro Fibra',              130.00, 'Contas',        'Débito Automático',  'liberdade_30',    'Arlison',             12),
  ('Condomínio',               100.00, 'Contas',        'PIX',                'liberdade_30',    'Arlison',             13),
  ('Canva',                     47.00, 'Assinaturas',   '',                   'liberdade_30',    'Franciele',           14),
  ('Academia',                 200.00, 'Saúde',         'Cartão Nu Fran',     'liberdade_30',    'Franciele',           15),
  ('Notion',                    64.00, 'Assinaturas',   '',                   'liberdade_30',    'Franciele',           16),
  ('Personal',                 680.00, 'Saúde',         'PIX',                'investimento_20', 'Franciele',           17),
  ('Luz',                      500.00, 'Contas',        'Débito Automático',  'liberdade_30',    'Arlison',             18),
  ('Assinatura Carro',        2150.00, 'Assinaturas',   'Cartão Nu Arlison',  'liberdade_30',    'Franciele Transfere', 19),
  ('Amanzon',                   20.00, 'Assinaturas',   'Cartão Carrefour',   'liberdade_30',    'Arlison',             20),
  ('Parcelas',                1750.00, 'Dívidas',       '',                   'essencial_50',    'Arlison',             21),
  ('Inglês do Arthur',         300.00, 'Educação',      'PIX',                'investimento_20', 'Franciele',           22),
  ('Diarista',                 560.00, 'Utilitários',   'PIX',                'liberdade_30',    'Franciele',           23),
  ('Claude',                   220.00, 'Assinaturas',   'Cartão Carrefour',   'liberdade_30',    'Franciele Transfere', 24),
  ('Água',                     120.00, 'Contas',        'PIX',                'liberdade_30',    'Arlison',             25)
) as v(item, valor, tag, metodo, grupo, responsavel, ordem)
where not exists (
  select 1 from orcamento_planejado o
  where o.entidade_id = 'b0000000-0000-0000-0000-000000000001' and o.item = v.item
);
