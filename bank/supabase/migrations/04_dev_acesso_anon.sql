-- ============================================================
-- 04_dev_acesso_anon.sql — ACESSO DE DESENVOLVIMENTO
-- Só para as tabelas NOVAS do Bank. entidades/categorias/contas/
-- transacoes já têm dev_anon_* criadas pelo FM Gestão (04 e
-- 06_financeiro_base.sql do FM Gestão) com `using (true)` — cobrem
-- automaticamente as linhas novas do Bank também, sem precisar
-- recriar (e recriar daria erro de "policy already exists").
-- "drop policy if exists" antes de cada "create" torna o arquivo seguro
-- pra rodar mais de uma vez.
--
-- ⚠ REMOVER quando o Bank ganhar login próprio (os "drop policy"
-- estão no fim) — mesmo racional do 04_dev_acesso_anon.sql do FM Gestão.
-- ⚠ NÃO publicar o app na internet enquanto isto estiver ativo.
-- ============================================================

drop policy if exists "dev_anon_dividas" on dividas;
create policy "dev_anon_dividas" on dividas for all to anon using (true) with check (true);

drop policy if exists "dev_anon_metas" on metas;
create policy "dev_anon_metas" on metas for all to anon using (true) with check (true);

drop policy if exists "dev_anon_ativos" on ativos;
create policy "dev_anon_ativos" on ativos for all to anon using (true) with check (true);

drop policy if exists "dev_anon_movimentacoes_ativos" on movimentacoes_ativos;
create policy "dev_anon_movimentacoes_ativos" on movimentacoes_ativos for all to anon using (true) with check (true);

drop policy if exists "dev_anon_cotacoes_atuais" on cotacoes_atuais;
create policy "dev_anon_cotacoes_atuais" on cotacoes_atuais for all to anon using (true) with check (true);

drop policy if exists "dev_anon_renda_mensal" on renda_mensal;
create policy "dev_anon_renda_mensal" on renda_mensal for all to anon using (true) with check (true);

drop policy if exists "dev_anon_cartoes" on cartoes;
create policy "dev_anon_cartoes" on cartoes for all to anon using (true) with check (true);

drop policy if exists "dev_anon_faturas_cartao" on faturas_cartao;
create policy "dev_anon_faturas_cartao" on faturas_cartao for all to anon using (true) with check (true);

drop policy if exists "dev_anon_lancamentos_cartao" on lancamentos_cartao;
create policy "dev_anon_lancamentos_cartao" on lancamentos_cartao for all to anon using (true) with check (true);

drop policy if exists "dev_anon_planejamento_semanal" on planejamento_semanal;
create policy "dev_anon_planejamento_semanal" on planejamento_semanal for all to anon using (true) with check (true);

drop policy if exists "dev_anon_regras_categorizacao" on regras_categorizacao;
create policy "dev_anon_regras_categorizacao" on regras_categorizacao for all to anon using (true) with check (true);

drop policy if exists "dev_anon_importacoes_fatura" on importacoes_fatura;
create policy "dev_anon_importacoes_fatura" on importacoes_fatura for all to anon using (true) with check (true);

-- ============================================================
-- Para REMOVER quando o login entrar, rodar:
-- drop policy "dev_anon_dividas" on dividas;
-- drop policy "dev_anon_metas" on metas;
-- drop policy "dev_anon_ativos" on ativos;
-- drop policy "dev_anon_movimentacoes_ativos" on movimentacoes_ativos;
-- drop policy "dev_anon_cotacoes_atuais" on cotacoes_atuais;
-- drop policy "dev_anon_renda_mensal" on renda_mensal;
-- drop policy "dev_anon_cartoes" on cartoes;
-- drop policy "dev_anon_faturas_cartao" on faturas_cartao;
-- drop policy "dev_anon_lancamentos_cartao" on lancamentos_cartao;
-- drop policy "dev_anon_planejamento_semanal" on planejamento_semanal;
-- drop policy "dev_anon_regras_categorizacao" on regras_categorizacao;
-- drop policy "dev_anon_importacoes_fatura" on importacoes_fatura;
-- ============================================================
