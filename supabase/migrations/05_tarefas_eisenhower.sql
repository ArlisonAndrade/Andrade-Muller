-- ============================================================
-- 05_tarefas_eisenhower.sql — classificação de tarefas na
-- Matriz de Eisenhower (pedido do Arlison, 10/jul/2026).
-- fazer    = urgente + importante  (Fazer agora)
-- agendar  = importante, não urgente
-- delegar  = urgente, não importante
-- eliminar = nem urgente, nem importante
-- ============================================================

alter table fm_tarefas add column if not exists eisenhower text
  check (eisenhower in ('fazer', 'agendar', 'delegar', 'eliminar'));
