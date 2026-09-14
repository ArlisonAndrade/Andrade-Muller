-- Carteira sincronizada com o Investidor10 (decisão do Arlison, 14/set/2026).
--
-- A carga de 02/ago/2026 espelhou a carteira uma vez e congelou: nenhuma
-- cotação andou depois disso, e as compras feitas no Investidor10 (BBAS3,
-- GGRC11, o fundo XP) nunca chegaram aqui. A brapi não resolvia — exige token
-- e só cobre ações/FIIs, 11% da carteira.
--
-- O link público da carteira expõe a API interna que a própria página usa, com
-- quantidade, preço médio e valor em reais de TODOS os ativos (renda fixa já
-- com o CDI). `web/lib/bank/investidor10.ts` lê essa API e mantém a única
-- movimentação `origem = 'investidor10'` de cada ativo como espelho da posição
-- de lá. O dinheiro continua sendo registrado num lugar só — o Investidor10 —
-- e o Bank lê.

-- Qual carteira ler. O link é público, mas quem tem o id vê a carteira toda:
-- fica no banco (RLS por entidade), não no código.
insert into parametros_plano (entidade_id, chave, valor)
values ('b0000000-0000-0000-0000-000000000001', 'investidor10_wallet_id', 1778782)
on conflict (entidade_id, chave) do update set valor = excluded.valor;

-- Log de cada sincronização: é o que a tela mostra ("atualizado há 2 h") e o
-- que registra a falha em vez de engolir. `aplicado` de uma rodada pra outra
-- é o aporte líquido que aconteceu no meio.
create table if not exists sincronizacoes_investidor10 (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  executado_em timestamptz not null default now(),
  ok boolean not null,
  erro text,
  aplicado numeric(14,2),
  patrimonio numeric(14,2),
  ativos integer,
  -- o que mudou em relação ao banco: [{ticker, antes, depois, tipo}]
  alteracoes jsonb not null default '[]'::jsonb,
  origem text not null default 'manual' check (origem in ('manual', 'cron'))
);

create index if not exists sincronizacoes_investidor10_recentes
  on sincronizacoes_investidor10 (entidade_id, executado_em desc);

alter table sincronizacoes_investidor10 enable row level security;

drop policy if exists "acesso_sincronizacoes_investidor10_por_entidade" on sincronizacoes_investidor10;
create policy "acesso_sincronizacoes_investidor10_por_entidade" on sincronizacoes_investidor10 for all
using (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()))
with check (entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid()));
