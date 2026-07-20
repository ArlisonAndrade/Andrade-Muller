-- ============================================================
-- 07_import_fatura.sql — Fase 4 do Bank novo (19/jul/2026).
-- 1) lancamentos_cartao ganha vínculo com a transação gerada — a fatura
--    importada CONFERE e alimenta transacoes (fonte única do orçamento),
--    nunca vira um segundo livro.
-- 2) Seed das regras de categorização (match parcial, case-insensitive,
--    por prioridade) pros estabelecimentos mais comuns.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

alter table lancamentos_cartao add column if not exists transacao_id uuid references transacoes(id);

-- ---------- Seed — regras de categorização (Família) ----------
insert into regras_categorizacao (entidade_id, padrao_texto, categoria_id, prioridade)
select
  'b0000000-0000-0000-0000-000000000001'::uuid,
  v.padrao,
  c.id,
  v.prioridade
from (values
  ('IFOOD',         'Jantar/Food', 10),
  ('RESTAURANTE',   'Jantar/Food', 20),
  ('LANCHONETE',    'Jantar/Food', 20),
  ('PIZZARIA',      'Jantar/Food', 20),
  ('CARREFOUR',     'Mercado', 10),
  ('SUPERMERCADO',  'Mercado', 10),
  ('MERCADO',       'Mercado', 30),
  ('ATACADAO',      'Mercado', 20),
  ('ASSAI',         'Mercado', 20),
  ('PADARIA',       'Mercado', 30),
  ('POSTO',         'Combustível', 10),
  ('COMBUSTIVEL',   'Combustível', 10),
  ('IPIRANGA',      'Combustível', 20),
  ('SHELL',         'Combustível', 20),
  ('DROGARIA',      'Farmácia', 10),
  ('FARMACIA',      'Farmácia', 10),
  ('DROGASIL',      'Farmácia', 20),
  ('PAGUE MENOS',   'Farmácia', 20),
  ('AMAZON',        'E-Commerce/Compras', 10),
  ('MERCADOLIVRE',  'E-Commerce/Compras', 10),
  ('MERCADO LIVRE', 'E-Commerce/Compras', 10),
  ('SHOPEE',        'E-Commerce/Compras', 10),
  ('ALIEXPRESS',    'E-Commerce/Compras', 10),
  ('MAGALU',        'E-Commerce/Compras', 20),
  ('NETFLIX',       'Assinaturas', 10),
  ('SPOTIFY',       'Assinaturas', 10),
  ('DISNEY',        'Assinaturas', 10),
  ('HBO',           'Assinaturas', 10),
  ('PRIME VIDEO',   'Assinaturas', 10),
  ('CINEMA',        'Lazer', 10),
  ('INGRESSO',      'Lazer', 20)
) as v(padrao, categoria, prioridade)
join categorias c
  on c.entidade_id = 'b0000000-0000-0000-0000-000000000001'::uuid
 and c.nome = v.categoria
where not exists (
  select 1 from regras_categorizacao r
  where r.entidade_id = 'b0000000-0000-0000-0000-000000000001'::uuid
    and r.padrao_texto = v.padrao
);
