-- ============================================================
-- 04_dev_acesso_anon.sql — ACESSO DE DESENVOLVIMENTO
-- O login ficou para a última etapa do projeto (decisão 09/jul/2026).
-- Enquanto ele não existe, estas policies liberam leitura e escrita
-- para o acesso anônimo, senão a RLS bloqueia o app inteiro.
--
-- ⚠ REMOVER quando o login entrar (os "drop policy" estão no fim).
-- ⚠ NÃO publicar o app na internet enquanto isto estiver ativo.
-- ============================================================

create policy "dev_anon_entidades" on entidades for select to anon using (true);

create policy "dev_anon_fm_clientes" on fm_clientes for all to anon using (true) with check (true);
create policy "dev_anon_fm_negocios" on fm_negocios for all to anon using (true) with check (true);
create policy "dev_anon_fm_contratos" on fm_contratos for all to anon using (true) with check (true);
create policy "dev_anon_fm_reunioes" on fm_reunioes for all to anon using (true) with check (true);
create policy "dev_anon_fm_tarefas" on fm_tarefas for all to anon using (true) with check (true);
create policy "dev_anon_fm_faturamento" on fm_faturamento for all to anon using (true) with check (true);
create policy "dev_anon_fm_metas_okrs" on fm_metas_okrs for all to anon using (true) with check (true);
create policy "dev_anon_fm_checklist_saude" on fm_checklist_saude for all to anon using (true) with check (true);

-- ============================================================
-- Para REMOVER na etapa do login, rodar:
-- drop policy "dev_anon_entidades" on entidades;
-- drop policy "dev_anon_fm_clientes" on fm_clientes;
-- drop policy "dev_anon_fm_negocios" on fm_negocios;
-- drop policy "dev_anon_fm_contratos" on fm_contratos;
-- drop policy "dev_anon_fm_reunioes" on fm_reunioes;
-- drop policy "dev_anon_fm_tarefas" on fm_tarefas;
-- drop policy "dev_anon_fm_faturamento" on fm_faturamento;
-- drop policy "dev_anon_fm_metas_okrs" on fm_metas_okrs;
-- drop policy "dev_anon_fm_checklist_saude" on fm_checklist_saude;
-- ============================================================
