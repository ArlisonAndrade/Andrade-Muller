-- ============================================================
-- 14_semana_categorias.sql — o que entra na conta da semana (30/jul/2026)
--
-- A meta semanal do Arlison (R$ 1.600) é sobre "gastos diversos": mercado,
-- food, jantar, almoço, farmácia, presentes — o dinheiro que passa pela mão
-- toda semana. NÃO é sobre conta fixa nem parcela de compra antiga: essas
-- já estão decididas, não é nelas que o comportamento muda.
--
-- Sem esta marcação o bot somava toda despesa da semana e uma única linha
-- de "Fatura" ou "Moradia" estourava a meta sozinha — a régua nasceria
-- mentindo e o hábito morreria na primeira semana.
--
-- Idempotente. Roda depois da 13.
-- ============================================================

alter table categorias
  add column if not exists conta_na_semana boolean not null default true;

comment on column categorias.conta_na_semana is
  'Entra no total da semana (meta semanal do Telegram e da tela /bank/semanas). '
  'false = conta fixa, parcela ou aporte: gasto que não é decidido semana a semana.';

-- Fora da semana: conta fixa, fatura/parcela e aporte. Por nome porque as
-- categorias são semeadas com nome estável e ids gerados.
update categorias set conta_na_semana = false
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and nome in (
    -- conta fixa
    'Contas', 'Moradia', 'Utilitários', 'Assinaturas', 'Saúde — Fixa',
    -- fatura e parcelamento (a compra já foi feita; o gasto foi em outra semana)
    'Fatura', 'Dívidas', 'Dívidas (parcelas cartão)',
    -- aporte: sai da conta, mas é patrimônio mudando de lugar, não consumo
    'Investimentos', 'Reserva de emergência', 'Educação', 'Saúde — Investimento'
  );

-- Semana 01 do modelo novo: 27/jul a 02/ago de 2026, meta de R$ 1.600
-- (média das últimas 15 semanas que o Arlison acompanhava na planilha).
insert into semanas_orcamento (entidade_id, semana_inicio, meta)
values ('b0000000-0000-0000-0000-000000000001', '2026-07-27', 1600)
on conflict (entidade_id, semana_inicio) do update set meta = excluded.meta;
