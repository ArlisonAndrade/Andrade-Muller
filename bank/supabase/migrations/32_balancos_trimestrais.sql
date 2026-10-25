-- ============================================================
-- 32 — Balanço Patrimonial Trimestral em PDF (25/out/2026)
--
-- A reunião trimestral não acontece ("nunca dá tempo"), então o Arkad manda
-- o balanço do trimestre em PDF no grupo (botão no Modo TV). O parecer do
-- Arkad é escrito pelo modelo: fica guardado aqui na primeira geração para
-- que o PDF enviado seja o mesmo que o Arlison conferiu em "Ver PDF".
-- `enviado_em` registra o último envio (o botão avisa antes de mandar de novo).
-- Seguro pra rodar mais de uma vez.
-- ============================================================

create table if not exists balancos_trimestrais (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  trimestre text not null,              -- 'AAAA-T#'
  parecer jsonb not null,               -- parágrafos do parecer do Arkad
  gerado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique (entidade_id, trimestre)
);

alter table balancos_trimestrais enable row level security;
drop policy if exists "acesso_balancos_trimestrais_por_entidade" on balancos_trimestrais;
create policy "acesso_balancos_trimestrais_por_entidade" on balancos_trimestrais for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));
