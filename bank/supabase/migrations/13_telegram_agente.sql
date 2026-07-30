-- ============================================================
-- 13_telegram_agente.sql — Consultor financeiro no Telegram (Fase A,
-- 29/jul/2026). O grupo da família (Arlison + Franciele + bot) vira um
-- canal de lançamento: a mensagem chega pelo n8n, o app interpreta com a
-- Claude API e grava em `transacoes` — a MESMA fonte de verdade da web.
--
-- Três coisas aqui:
--   1. telegram_membros — quem pode falar com o bot e a quem o gasto pertence
--   2. transacoes.origem/origem_ref/pessoa_id — rastro e dedup idempotente
--   3. agente_mensagens — log da conversa, auditoria e o botão "desfazer"
--
-- Idempotente (if not exists / drop-create de policy). Roda depois da 12.
-- ============================================================

-- ---------- 1. TELEGRAM_MEMBROS (whitelist + de quem é o gasto) ----------
-- O bot só responde a (chat_id, user_id) cadastrados aqui. Mensagem de grupo
-- ou pessoa desconhecida é ignorada — é o que impede qualquer um que
-- descubra o bot de lançar despesa na família.
-- pessoa_id é o que faz o gasto da Franciele nascer já atribuído a ela,
-- sem ninguém digitar nada.
create table if not exists telegram_membros (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  telegram_chat_id bigint not null,            -- id do grupo (negativo no Telegram)
  telegram_user_id bigint not null,            -- id da pessoa que enviou
  pessoa_id uuid references pessoas(id) on delete set null,
  nome_telegram text,                          -- só para conferência humana
  ativo boolean not null default true,
  created_at timestamptz default now()
);
create unique index if not exists idx_telegram_membro
  on telegram_membros(telegram_chat_id, telegram_user_id);

-- ---------- 2. TRANSACOES: origem, dedup e responsável ----------
alter table transacoes add column if not exists origem text;
alter table transacoes drop constraint if exists transacoes_origem_check;
alter table transacoes add constraint transacoes_origem_check
  check (origem is null or origem in ('web','telegram','fatura','recorrencia'));

-- origem_ref = chave natural da mensagem que gerou o lançamento
-- ('telegram:<chat_id>:<message_id>'). O unique index é o que torna o
-- webhook idempotente: se o n8n reentregar a mesma mensagem (retry, restart
-- do container), o insert falha em vez de duplicar o gasto.
alter table transacoes add column if not exists origem_ref text;
create unique index if not exists idx_transacoes_origem_ref
  on transacoes(origem_ref) where origem_ref is not null;

-- Quem gastou. Alimenta a visão "por pessoa" da aba semanal (Fase B) e
-- reaproveita as cores já cadastradas em `pessoas`.
alter table transacoes add column if not exists pessoa_id uuid references pessoas(id) on delete set null;

-- ---------- 3. AGENTE_MENSAGENS (log, auditoria e desfazer) ----------
-- Uma linha por mensagem processada. `interpretacao` guarda o JSON cru que
-- a IA devolveu — é o que permite depurar uma categorização errada depois.
-- `transacao_ids` é o que o botão "desfazer" apaga.
create table if not exists agente_mensagens (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  telegram_chat_id bigint,
  telegram_message_id bigint,
  telegram_user_id bigint,
  pessoa_id uuid references pessoas(id) on delete set null,
  texto_recebido text,
  acao text check (acao is null or acao in ('lancar','responder','ignorar','erro')),
  interpretacao jsonb,
  transacao_ids uuid[] not null default '{}',
  resposta_enviada text,
  desfeita_em timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists idx_agente_mensagem_telegram
  on agente_mensagens(telegram_chat_id, telegram_message_id)
  where telegram_message_id is not null;
create index if not exists idx_agente_mensagens_entidade_data
  on agente_mensagens(entidade_id, created_at desc);

-- ---------- 4. RLS (padrão de 02_rls_completa.sql — por entidade_membros) ----------
-- O agente escreve com a service-role key (que ignora RLS) porque não há
-- sessão de browser no n8n; estas policies são para a UI da Fase B ler o
-- log com a sessão do Arlison/Franciele.
alter table telegram_membros enable row level security;
alter table agente_mensagens enable row level security;

drop policy if exists "acesso_telegram_membros_por_entidade" on telegram_membros;
create policy "acesso_telegram_membros_por_entidade" on telegram_membros for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_agente_mensagens_por_entidade" on agente_mensagens;
create policy "acesso_agente_mensagens_por_entidade" on agente_mensagens for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- ---------- 5. Cadastro dos membros (rodar depois de descobrir os ids) ----------
-- O bot responde "não te conheço" com o chat_id e o user_id na primeira
-- mensagem de alguém não cadastrado. Cole os números aqui e rode este bloco.
--
-- insert into telegram_membros (entidade_id, telegram_chat_id, telegram_user_id, pessoa_id, nome_telegram)
-- select 'b0000000-0000-0000-0000-000000000001'::uuid, -1001234567890, 111111111,
--        (select id from pessoas where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Arlison'),
--        'Arlison'
-- where not exists (
--   select 1 from telegram_membros where telegram_chat_id = -1001234567890 and telegram_user_id = 111111111
-- );
--
-- insert into telegram_membros (entidade_id, telegram_chat_id, telegram_user_id, pessoa_id, nome_telegram)
-- select 'b0000000-0000-0000-0000-000000000001'::uuid, -1001234567890, 222222222,
--        (select id from pessoas where entidade_id = 'b0000000-0000-0000-0000-000000000001' and nome = 'Franciele'),
--        'Franciele'
-- where not exists (
--   select 1 from telegram_membros where telegram_chat_id = -1001234567890 and telegram_user_id = 222222222
-- );
