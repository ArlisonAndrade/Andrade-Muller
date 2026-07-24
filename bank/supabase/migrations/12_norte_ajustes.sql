-- ============================================================
-- 12_norte_ajustes.sql — Ajustes pedidos após o primeiro uso real do
-- Norte (24/jul/2026): "Franciele Transfere" não é uma pessoa, é um
-- valor que a Franciele transfere pro Arlison; divisão 50/30/20 vira
-- lista de presets + personalizada; cartões ganham titular/bandeira
-- pra virar visual de cartão de verdade.
-- Idempotente. Roda depois de 10_norte.sql e 11_norte_seed.sql.
-- ============================================================

-- ---------- 1. "Franciele Transfere" deixa de ser pessoa ----------
-- Vira uma flag no item: ele é responsabilidade financeira da Franciele,
-- mas o pagamento sai por um método/cartão que exige ela transferir a
-- grana antes (normalmente pro Arlison). Reatribui os itens pra Franciele
-- com transferencia=true, depois remove a pessoa fictícia.
alter table orcamento_planejado add column if not exists transferencia boolean not null default false;

update orcamento_planejado
set responsavel_id = (
      select id from pessoas
      where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Franciele'
    ),
    transferencia = true
where entidade_id = 'b0000000-0000-0000-0000-000000000001'
  and responsavel_id = (
        select id from pessoas
        where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Franciele Transfere'
      );

delete from pessoas
where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Franciele Transfere';

-- ---------- 2. Cartões: titular + bandeira (pro visual de cartão) ----------
alter table cartoes add column if not exists titular text;
alter table cartoes add column if not exists bandeira text;

update cartoes set titular = 'Arlison', bandeira = 'carrefour'
where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Cartão Carrefour' and titular is null;
update cartoes set titular = 'Arlison', bandeira = 'nubank'
where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Cartão Nu Arlison' and titular is null;
update cartoes set titular = 'Franciele', bandeira = 'nubank'
where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Cartão Nu Fran' and titular is null;
update cartoes set bandeira = 'nubank'
where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Cartão Nubank' and bandeira is null;

-- ---------- 3. Divisão 50/30/20: presets + personalizada ----------
create table if not exists divisao_orcamento_config (
  entidade_id uuid primary key references entidades(id) on delete cascade,
  preset text not null default '50_30_20'
    check (preset in ('50_30_20', '45_35_20', '40_30_30', 'personalizada')),
  pct_essencial numeric(5,2) not null default 50,
  pct_liberdade numeric(5,2) not null default 30,
  pct_investimento numeric(5,2) not null default 20,
  pct_extra numeric(5,2) not null default 0,
  extra_nome text,
  updated_at timestamptz default now()
);

alter table divisao_orcamento_config enable row level security;

drop policy if exists "acesso_divisao_orcamento_config_por_entidade" on divisao_orcamento_config;
create policy "acesso_divisao_orcamento_config_por_entidade" on divisao_orcamento_config for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

insert into divisao_orcamento_config (entidade_id)
values ('b0000000-0000-0000-0000-000000000001')
on conflict (entidade_id) do nothing;
