-- ============================================================
-- 13 — NFS-e e extratos guardados no Portal + envio por e-mail (01/out/2026)
--
-- Fluxo: a Franciele/Arlison sobe o PDF original da NFS-e no Portal → o PDF é
-- lido (número, chave, CNPJ do tomador, valor, competência) → guardado como
-- veio no bucket privado `fiscal` → a nota entra/atualiza em fm_faturamento →
-- "Salvar e enviar" manda um e-mail por destinatário com os PDFs ORIGINAIS
-- (SHA-256 conferido antes de anexar). Extrato OFX do mês também é guardado.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

-- Clientes: CNPJ/CPF (reconhece o tomador pela nota) e pra quem vai a nota.
alter table fm_clientes add column if not exists documento text;   -- só dígitos
alter table fm_clientes add column if not exists email_nf text;    -- destinatário da NFS-e
alter table fm_clientes add column if not exists contato_nf text;  -- nome na saudação

update fm_clientes set documento = '19452264000104', email_nf = 'rh.notafiscal@ibvet.com.br', contato_nf = 'Marta'
where id = 'c1000000-0000-0000-0000-000000000001'; -- IBVET
-- A nota da IEA também vai pra Marta (é assim desde dez/2025: um e-mail só, as duas notas juntas).
update fm_clientes set documento = '54846593000130', email_nf = 'rh.notafiscal@ibvet.com.br', contato_nf = 'Marta'
where id = 'c1000000-0000-0000-0000-000000000002'; -- IEA
update fm_clientes set documento = '82149968053' where id = 'c1000000-0000-0000-0000-000000000003'; -- Juliana
update fm_clientes set documento = '31428213000142' where id = 'c1000000-0000-0000-0000-000000000005'; -- Fernanda

-- Notas: chave nacional, impressão digital do PDF e controle de envio.
alter table fm_faturamento add column if not exists chave_nfse text;
alter table fm_faturamento add column if not exists arquivo_sha256 text;
alter table fm_faturamento add column if not exists enviada_em timestamptz;
alter table fm_faturamento add column if not exists enviada_para text;
create unique index if not exists idx_fm_faturamento_chave on fm_faturamento (chave_nfse) where chave_nfse is not null;

-- Set/2026 já foi enviada pelo script em 01/10/2026 10:13.
update fm_faturamento set enviada_em = '2026-10-01 13:13:42+00', enviada_para = 'rh.notafiscal@ibvet.com.br'
where competencia = '2026-09-01' and numero_nfse in ('Nr 37', 'Nr 38') and enviada_em is null;

-- Extrato do mês (arquivo OFX guardado; as linhas continuam em transacoes).
create table if not exists fm_extratos (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  competencia date not null,              -- 1º dia do mês do extrato
  arquivo_path text not null,             -- caminho no bucket `fiscal`
  arquivo_nome text not null,
  arquivo_sha256 text not null,
  linhas_importadas int not null default 0,
  created_at timestamptz default now(),
  unique (entidade_id, competencia)
);
alter table fm_extratos enable row level security;
drop policy if exists "acesso_fm_extratos_por_entidade" on fm_extratos;
create policy "acesso_fm_extratos_por_entidade" on fm_extratos for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- Bucket privado. Só membros da consultoria leem/escrevem.
insert into storage.buckets (id, name, public)
values ('fiscal', 'fiscal', false)
on conflict (id) do nothing;

drop policy if exists "fiscal_membros_consultoria" on storage.objects;
create policy "fiscal_membros_consultoria" on storage.objects for all to authenticated
using (
  bucket_id = 'fiscal'
  and 'a0000000-0000-0000-0000-00000000f001'::uuid in (select entidade_id from entidade_membros where membro_id = auth.uid())
)
with check (
  bucket_id = 'fiscal'
  and 'a0000000-0000-0000-0000-00000000f001'::uuid in (select entidade_id from entidade_membros where membro_id = auth.uid())
);
