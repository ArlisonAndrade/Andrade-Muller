-- ============================================================
-- 33 — Decisões do trimestre com botões no Telegram (25/out/2026)
--
-- O balanço trimestral substitui a reunião que "nunca dá tempo". As decisões
-- que sairiam dela viram perguntas no grupo, com botões, e CADA UM responde
-- por si (pedido do Arlison: cobrança individual). As respostas entram na
-- página 5 do balanço; resposta divergente aparece como "decidir juntos".
-- Dá pra trocar a resposta até o balanço fechar.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

create table if not exists decisoes_perguntas (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  trimestre text not null,            -- 'AAAA-T#'
  numero int not null,                -- 1, 2, 3…
  texto text not null,
  opcoes jsonb not null,              -- ["opção 1", "opção 2", …] — o botão manda o índice
  created_at timestamptz default now(),
  unique (entidade_id, trimestre, numero)
);

create table if not exists decisoes_respostas (
  id uuid primary key default gen_random_uuid(),
  pergunta_id uuid not null references decisoes_perguntas(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  opcao int not null,
  respondida_em timestamptz not null default now(),
  unique (pergunta_id, pessoa_id)
);

alter table decisoes_perguntas enable row level security;
drop policy if exists "acesso_decisoes_perguntas_por_entidade" on decisoes_perguntas;
create policy "acesso_decisoes_perguntas_por_entidade" on decisoes_perguntas for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

alter table decisoes_respostas enable row level security;
drop policy if exists "acesso_decisoes_respostas_por_entidade" on decisoes_respostas;
create policy "acesso_decisoes_respostas_por_entidade" on decisoes_respostas for all
using (pergunta_id in (select id from decisoes_perguntas where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())))
with check (pergunta_id in (select id from decisoes_perguntas where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())));

-- Quando as perguntas foram pro grupo e quando o balanço com as decisões saiu
-- (depois disso a resposta não muda mais).
alter table balancos_trimestrais add column if not exists perguntas_enviadas_em timestamptz;
alter table balancos_trimestrais add column if not exists decisoes_fechadas_em timestamptz;

-- As 3 perguntas do 3T26 (aprovadas pelo Arlison em 25/out/2026). A 3ª trocou
-- "responder por texto" por "Tudo para o Santander": resposta digitada no grupo
-- seria lida pelo Arkad como lançamento.
insert into decisoes_perguntas (entidade_id, trimestre, numero, texto, opcoes)
values
  ('b0000000-0000-0000-0000-000000000001', '2026-T3', 1,
   'A sobra do mês está cobrindo os estouros. Qual mudança vocês fazem no 4T26?',
   '["Rever a assinatura do carro", "Cortar 1 item de bem-estar", "Comida fora no máximo 4x por semana", "Subir a meta para R$ 1.800"]'),
  ('b0000000-0000-0000-0000-000000000001', '2026-T3', 2,
   'De onde sai o aporte de R$ 1.000 de novembro?',
   '["Da renda do mês", "Da reserva, sabendo disso", "Pular novembro"]'),
  ('b0000000-0000-0000-0000-000000000001', '2026-T3', 3,
   'Dezembro traz o 13º. Para onde ele vai, na ordem reserva → Santander → renda variável?',
   '["Tudo para a reserva", "Metade reserva, metade Santander", "Tudo para o Santander"]')
on conflict (entidade_id, trimestre, numero) do nothing;
