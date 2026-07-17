-- ============================================================
-- 09_google_agenda.sql — SINCRONIZAÇÃO COM O GOOGLE AGENDA
-- Decisão do Arlison (12/jul/2026): antecipar o OAuth do Google só
-- para a integração de calendário, sem construir o login do painel.
-- É uma CONEXÃO de integração (refresh token guardado no servidor),
-- não a autenticação de usuário — essa continua para a unificação.
--
-- ⚠ Os tokens ficam legíveis pelo acesso anônimo de dev (policy abaixo).
-- Aceitável em dev local single-tenant. Quando o login do painel entrar,
-- restringir fm_google_integracao a authenticated (drop no fim do arquivo).
-- ============================================================

-- Vínculo reunião ↔ evento no Google Calendar
alter table fm_reunioes add column if not exists gcal_event_id text;
create index if not exists idx_fm_reunioes_gcal
  on fm_reunioes(gcal_event_id) where gcal_event_id is not null;

-- Credenciais e estado da integração. Linha única (single-tenant):
-- a coluna id é sempre true, então só existe uma linha possível.
create table if not exists fm_google_integracao (
  id boolean primary key default true check (id),
  email text,                        -- conta Google conectada
  access_token text,
  refresh_token text,
  token_expiry timestamptz,          -- quando o access_token vence
  calendar_id text default 'primary',
  sync_token text,                   -- nextSyncToken do último pull incremental
  conectado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

alter table fm_google_integracao enable row level security;

-- Acesso de desenvolvimento (mesmo padrão do 04_dev_acesso_anon.sql).
-- ⚠ REMOVER quando o login entrar.
create policy "dev_anon_fm_google_integracao"
  on fm_google_integracao for all to anon using (true) with check (true);

-- ============================================================
-- Para REMOVER na etapa do login, rodar:
-- drop policy "dev_anon_fm_google_integracao" on fm_google_integracao;
-- e criar policy equivalente restrita a authenticated.
-- ============================================================
