-- Jornada patrimonial: a curva dura (2021→2032) da planilha do Arlison —
-- dívida no vermelho até a virada, depois o crescimento. Vive fora de
-- snapshots_patrimonio (que só começou a existir em 2025) porque aqui o
-- objetivo é contar a história inteira, passado e projeção, não só o real.
create table if not exists jornada_patrimonio (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades(id) on delete cascade,
  ano int not null,
  investimento numeric not null default 0,
  dividas numeric not null default 0,
  marco_emoji text,
  marco_titulo text,
  marco_data date,
  created_at timestamptz default now(),
  unique (entidade_id, ano)
);

alter table jornada_patrimonio enable row level security;

create policy "jornada_patrimonio_acesso" on jornada_patrimonio
  for all using (
    entidade_id in (select entidade_id from entidade_membros where membro_id = auth.uid())
  );

insert into jornada_patrimonio (entidade_id, ano, investimento, dividas, marco_emoji, marco_titulo, marco_data) values
  ('b0000000-0000-0000-0000-000000000001', 2021, 0,       200000.00, null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2022, 0,       550000.00, null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2023, 0,       700000.00, null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2024, 15000.00, 650000.00, '🔑', 'A virada da chave',           '2024-05-08'),
  ('b0000000-0000-0000-0000-000000000001', 2025, 55000.00, 500000.00, '💰', 'R$ 50 mil investidos',        '2025-10-01'),
  ('b0000000-0000-0000-0000-000000000001', 2026, 75532.80, 160000.00, null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2027, 106996.74, 130000.00, null, null,                         null),
  ('b0000000-0000-0000-0000-000000000001', 2028, 147836.34, 90000.00, null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2029, 199176.71, 50000.00, null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2030, 260037.91, 0,        null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2031, 331562.46, 0,        null, null,                          null),
  ('b0000000-0000-0000-0000-000000000001', 2032, 416149.95, 0,        null, null,                          null)
on conflict (entidade_id, ano) do nothing;
