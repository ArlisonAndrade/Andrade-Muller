-- Marco zero do plano em julho/2026 (decisão do Arlison, 15/set/2026, opção B).
--
-- Julho foi a negociação da dívida com o Banco do Brasil — o mês em que o
-- plano deixou de ser "modo desespero". A curva, a Fase 1 e o "construído
-- desde o marco zero" contam de lá. O PLACAR do aporte (sequência, medalhas,
-- cumprido/não) só começa em outubro: julho–setembro aparecem como
-- "reorganização", não como falha.
--
-- Por que existe aporte informado: o aporte automático é "quanto o aplicado
-- cresceu no mês", e desde julho ele não cresce — o Arlison aporta R$ 750/mês
-- (R$ 500 no PGBL do Arthur + R$ 250 na renda fixa do CNPJ) tirando o valor
-- da reserva, que já tinha emprestado a entrada da negociação do BB. Pra ele
-- é aporte de verdade e a reserva é uma dívida consigo mesmo, a ser paga. O
-- número informado aqui vale mais que o calculado.

insert into parametros_plano (entidade_id, chave, valor) values
  ('b0000000-0000-0000-0000-000000000001', 'plano_inicio', 202607),
  ('b0000000-0000-0000-0000-000000000001', 'plano_valor_inicial', 58623.09), -- foto de jul/2026
  ('b0000000-0000-0000-0000-000000000001', 'plano_inicio_placar', 202610)
on conflict (entidade_id, chave) do update set valor = excluded.valor;

create table if not exists aportes_mensais (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  mes date not null, -- primeiro dia do mês
  valor numeric(14,2) not null,
  origem text not null default 'manual' check (origem in ('manual', 'telegram')),
  nota text,
  created_at timestamptz not null default now(),
  unique (entidade_id, mes)
);

alter table aportes_mensais enable row level security;

drop policy if exists "acesso_aportes_mensais_por_entidade" on aportes_mensais;
create policy "acesso_aportes_mensais_por_entidade" on aportes_mensais for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

insert into aportes_mensais (entidade_id, mes, valor, nota) values
  ('b0000000-0000-0000-0000-000000000001', '2026-07-01', 750, 'R$ 500 PGBL Arthur + R$ 250 RF CNPJ, saindo da reserva'),
  ('b0000000-0000-0000-0000-000000000001', '2026-08-01', 750, 'R$ 500 PGBL Arthur + R$ 250 RF CNPJ, saindo da reserva'),
  ('b0000000-0000-0000-0000-000000000001', '2026-09-01', 930, 'R$ 750 de sempre + R$ 180 em FII')
on conflict (entidade_id, mes) do update set valor = excluded.valor, nota = excluded.nota;
