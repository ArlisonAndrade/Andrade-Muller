-- ============================================================
-- 08_parcelas_divida.sql — Fase 5 do Bank novo (19/jul/2026).
-- Parcelas individuais de dívida: cronograma Price gerado no app (ou
-- ajustado na mão pra bater com a tabela do contrato), baixa de parcela
-- normal e ADIANTADA (paga só a amortização — a economia é o juro da
-- parcela), plano anual visual. A tabela `dividas` continua como agregado
-- (compatível com o card da home); as actions mantêm os dois em sincronia.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

create table if not exists parcelas_divida (
  id uuid primary key default gen_random_uuid(),
  divida_id uuid not null references dividas(id) on delete cascade,
  numero int not null,
  data_vencimento date not null,
  valor_parcela numeric(14,2) not null,
  valor_amortizacao numeric(14,2),
  valor_juros numeric(14,2),
  paga boolean not null default false,
  paga_em date,
  adiantada boolean not null default false,
  valor_pago_efetivo numeric(14,2),
  transacao_id uuid references transacoes(id),
  created_at timestamptz default now(),
  unique (divida_id, numero)
);

alter table parcelas_divida enable row level security;

-- Acesso via dívida-mãe (mesmo padrão de faturas_cartao → cartoes).
drop policy if exists "acesso_parcelas_divida_por_entidade" on parcelas_divida;
create policy "acesso_parcelas_divida_por_entidade"
on parcelas_divida for all
using (
  divida_id in (
    select id from dividas
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  divida_id in (
    select id from dividas
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

create index if not exists idx_parcelas_divida_divida
  on parcelas_divida (divida_id, numero);
