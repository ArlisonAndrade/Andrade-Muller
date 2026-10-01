-- ============================================================
-- 25 — Movimentos da carteira: entradas × retiradas, ativo por ativo (01/out/2026)
--
-- Regra do Arlison: aporte do mês = tudo que ENTROU no Investidor10 no mês;
-- retirada NÃO desconta (em set/2026 foi a manobra de tirar da reserva de
-- emergência). Até aqui o aporte era o crescimento LÍQUIDO do aplicado entre
-- duas fotos mensais — uma retirada apagava o aporte. A sincronização
-- (web/lib/bank/investidor10.ts) passa a gravar aqui cada entrada/retirada
-- que ela percebe ao comparar a posição de antes com a de agora.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

create table if not exists movimentos_carteira (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  data date not null,
  ativo_ref text,                 -- origem_ref do ativo (i10:Classe:id)
  ticker text not null,
  tipo text not null check (tipo in ('entrada', 'retirada')),
  valor numeric(14,2) not null check (valor > 0),   -- custo que entrou/saiu, em R$
  origem text not null default 'investidor10',      -- investidor10 | log (recuperado do log)
  created_at timestamptz default now()
);
create index if not exists idx_movimentos_carteira_data on movimentos_carteira (entidade_id, data);

alter table movimentos_carteira enable row level security;
drop policy if exists "acesso_movimentos_carteira_por_entidade" on movimentos_carteira;
create policy "acesso_movimentos_carteira_por_entidade" on movimentos_carteira for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- Retiradas de set/2026, recuperadas do log das sincronizações
-- (sincronizacoes_investidor10.alteracoes): a manobra da reserva.
insert into movimentos_carteira (entidade_id, data, ticker, tipo, valor, origem)
select 'b0000000-0000-0000-0000-000000000001'::uuid, v.data, v.ticker, 'retirada', v.valor, 'log'
from (values
  ('2026-09-14'::date, 'CDB - Mercado Pago - Pós-Fixado - 105% CDI', 457.86),
  ('2026-09-24'::date, 'CDB - Mercado Pago - Pós-Fixado - 120% CDI', 1737.79)
) as v(data, ticker, valor)
where not exists (
  select 1 from movimentos_carteira m
  where m.entidade_id = 'b0000000-0000-0000-0000-000000000001'::uuid
    and m.data = v.data and m.ticker = v.ticker and m.tipo = 'retirada'
);
