-- ============================================================
-- 02_rls_completa.sql — políticas de acesso completo por entidade,
-- só para as tabelas NOVAS do Bank. entidades/membros/entidade_membros/
-- categorias/contas/transacoes já têm RLS + policies (mesmos nomes que
-- usaríamos aqui) criadas pelo FM Gestão em 00_base.sql e
-- 06_financeiro_base.sql — recriar daria erro de "policy already exists".
-- Padrão: membro da entidade tem acesso total (MVP tem um único
-- nível de permissão — mesmo padrão usado no FM Gestão).
-- "drop policy if exists" antes de cada "create" torna o arquivo seguro
-- pra rodar mais de uma vez (Postgres não tem "create policy if not exists").
-- ============================================================

drop policy if exists "acesso_dividas_por_entidade" on dividas;
create policy "acesso_dividas_por_entidade"
on dividas for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_metas_por_entidade" on metas;
create policy "acesso_metas_por_entidade"
on metas for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_movimentacoes_ativos_por_entidade" on movimentacoes_ativos;
create policy "acesso_movimentacoes_ativos_por_entidade"
on movimentacoes_ativos for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_renda_mensal_por_entidade" on renda_mensal;
create policy "acesso_renda_mensal_por_entidade"
on renda_mensal for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_cartoes_por_entidade" on cartoes;
create policy "acesso_cartoes_por_entidade"
on cartoes for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_planejamento_semanal_por_entidade" on planejamento_semanal;
create policy "acesso_planejamento_semanal_por_entidade"
on planejamento_semanal for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

drop policy if exists "acesso_regras_categorizacao_por_entidade" on regras_categorizacao;
create policy "acesso_regras_categorizacao_por_entidade"
on regras_categorizacao for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));

-- ---------- tabelas que chegam na entidade via cartao_id ----------
drop policy if exists "acesso_faturas_cartao_por_entidade" on faturas_cartao;
create policy "acesso_faturas_cartao_por_entidade"
on faturas_cartao for all
using (
  cartao_id in (
    select id from cartoes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cartao_id in (
    select id from cartoes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

drop policy if exists "acesso_lancamentos_cartao_por_entidade" on lancamentos_cartao;
create policy "acesso_lancamentos_cartao_por_entidade"
on lancamentos_cartao for all
using (
  fatura_id in (
    select f.id from faturas_cartao f
    join cartoes c on c.id = f.cartao_id
    where c.entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  fatura_id in (
    select f.id from faturas_cartao f
    join cartoes c on c.id = f.cartao_id
    where c.entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

drop policy if exists "acesso_importacoes_fatura_por_entidade" on importacoes_fatura;
create policy "acesso_importacoes_fatura_por_entidade"
on importacoes_fatura for all
using (
  fatura_id in (
    select f.id from faturas_cartao f
    join cartoes c on c.id = f.cartao_id
    where c.entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  fatura_id in (
    select f.id from faturas_cartao f
    join cartoes c on c.id = f.cartao_id
    where c.entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- ---------- ativos / cotações — referência compartilhada entre entidades (B3) ----------
-- Não são dados sensíveis por entidade (ticker e cotação são públicos);
-- liberado para qualquer membro autenticado do sistema.
drop policy if exists "membros_acessam_ativos" on ativos;
create policy "membros_acessam_ativos"
on ativos for all
to authenticated
using (exists (select 1 from entidade_membros where membro_id = auth.uid()))
with check (exists (select 1 from entidade_membros where membro_id = auth.uid()));

drop policy if exists "membros_acessam_cotacoes" on cotacoes_atuais;
create policy "membros_acessam_cotacoes"
on cotacoes_atuais for all
to authenticated
using (exists (select 1 from entidade_membros where membro_id = auth.uid()))
with check (exists (select 1 from entidade_membros where membro_id = auth.uid()));
