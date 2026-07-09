-- ============================================================
-- 02_rls_policies.sql — completa o padrão de RLS que o
-- fm_gestao_schema.sql define para fm_clientes (select) e
-- instrui replicar para as demais tabelas.
-- Padrão: membro da entidade tem acesso total (MVP tem um
-- único nível de permissão — PRD, seção "Usuários").
-- ============================================================

-- ---------- fm_clientes (select já existe na 01) ----------
create policy "escrita_fm_clientes_por_entidade"
on fm_clientes for insert
with check (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "update_fm_clientes_por_entidade"
on fm_clientes for update
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "delete_fm_clientes_por_entidade"
on fm_clientes for delete
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

-- ---------- tabelas com entidade_id direto ----------
create policy "acesso_fm_metas_okrs_por_entidade"
on fm_metas_okrs for all
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
)
with check (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

create policy "acesso_fm_checklist_saude_por_entidade"
on fm_checklist_saude for all
using (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
)
with check (
  entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
);

-- ---------- tabelas que chegam na entidade via cliente_id ----------
-- fm_negocios
create policy "acesso_fm_negocios_por_entidade"
on fm_negocios for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_contratos
create policy "acesso_fm_contratos_por_entidade"
on fm_contratos for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_reunioes
create policy "acesso_fm_reunioes_por_entidade"
on fm_reunioes for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_tarefas
create policy "acesso_fm_tarefas_por_entidade"
on fm_tarefas for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);

-- fm_faturamento
create policy "acesso_fm_faturamento_por_entidade"
on fm_faturamento for all
using (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
)
with check (
  cliente_id in (
    select id from fm_clientes
    where entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  )
);
