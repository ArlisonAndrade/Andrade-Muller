-- Gamificação do plano + reunião trimestral de alinhamento (decisões do
-- Arlison, 14/set/2026): medalhas da FAMÍLIA (jogam juntos, sem competição
-- entre o casal), anunciadas no grupo do Telegram, e um Modo TV com roteiro
-- de reunião a cada trimestre — a primeira em outubro/2026.
--
-- O catálogo de medalhas vive no código (web/lib/bank/conquistas.ts); aqui
-- fica só o que aconteceu: qual medalha, quando, e se já foi comemorada no
-- site e anunciada no grupo. Medalha conquistada nunca é apagada — cair
-- abaixo de um degrau não tira a medalha dele.

create table if not exists conquistas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  codigo text not null,
  -- quando o fato aconteceu (ex.: mês em que a carteira passou de R$ 50 mil);
  -- é por ela que a reunião trimestral sabe o que foi "deste trimestre"
  referencia_data date not null,
  conquistada_em timestamptz not null default now(), -- quando o sistema percebeu
  detalhe jsonb not null default '{}'::jsonb,
  celebrada_em timestamptz, -- comemoração exibida no site
  anunciada_em timestamptz, -- mensagem enviada no grupo do Telegram
  unique (entidade_id, codigo)
);

create table if not exists reunioes_trimestrais (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  trimestre text not null check (trimestre ~ '^\d{4}-T[1-4]$'), -- '2026-T3'
  realizada_em timestamptz not null default now(),
  -- [{ texto, cumprido: true|false|null }] — a reunião seguinte abre com eles
  compromissos jsonb not null default '[]'::jsonb,
  notas text,
  updated_at timestamptz not null default now(),
  unique (entidade_id, trimestre)
);

alter table conquistas enable row level security;
alter table reunioes_trimestrais enable row level security;

drop policy if exists "acesso_conquistas_por_entidade" on conquistas;
create policy "acesso_conquistas_por_entidade" on conquistas for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_reunioes_trimestrais_por_entidade" on reunioes_trimestrais;
create policy "acesso_reunioes_trimestrais_por_entidade" on reunioes_trimestrais for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));
