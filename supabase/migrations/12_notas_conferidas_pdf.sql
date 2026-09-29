-- ============================================================
-- 12 — Notas conferidas com os PDFs da pasta (28/set/2026)
--
-- A pasta "NFS-e Emitidas e Extrato/" tem o PDF oficial de cada NFS-e. Conferido
-- nota a nota: os totais por mês batiam, mas havia números trocados entre
-- clientes (mar 22/23, abr 24/25, mai 28/29 — a planilha tem a mesma troca),
-- a nº 35 de ago/26 estava no nome da IEA (é da IBVET) e as duas de set/26
-- estavam "pendente" sem número (são a 37 IBVET e 38 IEA, emitidas 28/09).
-- Cada nota passa a apontar pro PDF (arquivo_origem) e ganha a data de emissão.
-- A nº 1 de out/25 (teste, R$ 100) não tem PDF e fica como está. A nº 13
-- (jan/26) foi cancelada pela Franciele/Arlison porque saiu errada — por isso
-- não existe nem no sistema nem na pasta.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

-- A nº 35 é da IBVET: das duas notas de ago/26 no nome da IEA, a que tinha "35".
update fm_faturamento
set cliente_id = 'c1000000-0000-0000-0000-000000000001'
where competencia = '2026-08-01' and numero_nfse in ('35', 'Nr 35')
  and cliente_id = 'c1000000-0000-0000-0000-000000000002';

update fm_faturamento f
set numero_nfse = v.numero,
    data_emissao = v.emissao,
    arquivo_origem = v.arquivo,
    status = 'concluido'
from (values
  ('2025-12-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 10', '2025-12-30'::date, 'NFS-e Emitidas e Extrato/2025/Dezembro 25/10.pdf'),
  ('2025-12-01'::date, 'c1000000-0000-0000-0000-000000000003'::uuid, 80.00, 'Nr 11', '2025-12-30'::date, 'NFS-e Emitidas e Extrato/2025/Dezembro 25/11.pdf'),
  ('2025-12-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 9', '2025-12-30'::date, 'NFS-e Emitidas e Extrato/2025/Dezembro 25/9.pdf'),
  ('2025-11-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 6', '2025-11-30'::date, 'NFS-e Emitidas e Extrato/2025/Novembro 25/6.pdf'),
  ('2025-11-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 7', '2025-11-30'::date, 'NFS-e Emitidas e Extrato/2025/Novembro 25/7.pdf'),
  ('2025-11-01'::date, 'c1000000-0000-0000-0000-000000000003'::uuid, 80.00, 'Nr 8', '2025-11-30'::date, 'NFS-e Emitidas e Extrato/2025/Novembro 25/8.pdf'),
  ('2025-10-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 4', '2025-11-04'::date, 'NFS-e Emitidas e Extrato/2025/Outubro 25/4.pdf'),
  ('2025-10-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 5', '2025-11-04'::date, 'NFS-e Emitidas e Extrato/2025/Outubro 25/5.pdf'),
  ('2026-04-01'::date, 'c1000000-0000-0000-0000-000000000005'::uuid, 1222.50, 'Nr 24', '2026-04-09'::date, 'NFS-e Emitidas e Extrato/2026/Abril 26/24.pdf'),
  ('2026-04-01'::date, 'c1000000-0000-0000-0000-000000000003'::uuid, 80.00, 'Nr 25', '2026-04-09'::date, 'NFS-e Emitidas e Extrato/2026/Abril 26/25.pdf'),
  ('2026-04-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 26', '2026-04-30'::date, 'NFS-e Emitidas e Extrato/2026/Abril 26/26.pdf'),
  ('2026-04-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 27', '2026-04-30'::date, 'NFS-e Emitidas e Extrato/2026/Abril 26/27.pdf'),
  ('2026-08-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 5000.00, 'Nr 35', '2026-08-29'::date, 'NFS-e Emitidas e Extrato/2026/Agosto 26/43149022260563257000183000000000003526080358379434.pdf'),
  ('2026-08-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 5000.00, 'Nr 36', '2026-08-29'::date, 'NFS-e Emitidas e Extrato/2026/Agosto 26/43149022260563257000183000000000003626089656464011.pdf'),
  ('2026-02-01'::date, 'c1000000-0000-0000-0000-000000000005'::uuid, 1222.50, 'Nr 16', '2026-02-03'::date, 'NFS-e Emitidas e Extrato/2026/Fevereiro 26/16.pdf'),
  ('2026-02-01'::date, 'c1000000-0000-0000-0000-000000000003'::uuid, 80.00, 'Nr 17', '2026-02-04'::date, 'NFS-e Emitidas e Extrato/2026/Fevereiro 26/17.pdf'),
  ('2026-02-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 18', '2026-02-27'::date, 'NFS-e Emitidas e Extrato/2026/Fevereiro 26/18.pdf'),
  ('2026-02-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 19', '2026-02-27'::date, 'NFS-e Emitidas e Extrato/2026/Fevereiro 26/19.pdf'),
  ('2026-01-01'::date, 'c1000000-0000-0000-0000-000000000003'::uuid, 80.00, 'Nr 12', '2026-01-19'::date, 'NFS-e Emitidas e Extrato/2026/Janeiro 26/12.pdf'),
  ('2026-01-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 14', '2026-01-31'::date, 'NFS-e Emitidas e Extrato/2026/Janeiro 26/14.pdf'),
  ('2026-01-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 15', '2026-01-31'::date, 'NFS-e Emitidas e Extrato/2026/Janeiro 26/15.pdf'),
  ('2026-07-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 33', '2026-07-30'::date, 'NFS-e Emitidas e Extrato/2026/Julho 26/33.pdf'),
  ('2026-07-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 34', '2026-07-30'::date, 'NFS-e Emitidas e Extrato/2026/Julho 26/34.pdf'),
  ('2026-06-01'::date, 'c1000000-0000-0000-0000-000000000003'::uuid, 120.00, 'Nr 30', '2026-06-03'::date, 'NFS-e Emitidas e Extrato/2026/Junho 26/30.pdf'),
  ('2026-06-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 31', '2026-07-01'::date, 'NFS-e Emitidas e Extrato/2026/Junho 26/31.pdf'),
  ('2026-06-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 32', '2026-07-01'::date, 'NFS-e Emitidas e Extrato/2026/Junho 26/32.pdf'),
  ('2026-05-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 28', '2026-05-28'::date, 'NFS-e Emitidas e Extrato/2026/Maio 26/28.pdf'),
  ('2026-05-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 29', '2026-05-28'::date, 'NFS-e Emitidas e Extrato/2026/Maio 26/29.pdf'),
  ('2026-03-01'::date, 'c1000000-0000-0000-0000-000000000005'::uuid, 1222.50, 'Nr 20', '2026-03-04'::date, 'NFS-e Emitidas e Extrato/2026/Março 26/20.pdf'),
  ('2026-03-01'::date, 'c1000000-0000-0000-0000-000000000003'::uuid, 80.00, 'Nr 21', '2026-03-06'::date, 'NFS-e Emitidas e Extrato/2026/Março 26/21.pdf'),
  ('2026-03-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 4000.00, 'Nr 22', '2026-03-31'::date, 'NFS-e Emitidas e Extrato/2026/Março 26/22.pdf'),
  ('2026-03-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 3500.00, 'Nr 23', '2026-03-31'::date, 'NFS-e Emitidas e Extrato/2026/Março 26/23.pdf'),
  ('2026-09-01'::date, 'c1000000-0000-0000-0000-000000000001'::uuid, 5000.00, 'Nr 37', '2026-09-28'::date, 'NFS-e Emitidas e Extrato/2026/Setembro 26/43149022260563257000183000000000003726095548645670.pdf'),
  ('2026-09-01'::date, 'c1000000-0000-0000-0000-000000000002'::uuid, 5000.00, 'Nr 38', '2026-09-28'::date, 'NFS-e Emitidas e Extrato/2026/Setembro 26/43149022260563257000183000000000003826090475059523.pdf')
) as v(competencia, cliente_id, valor, numero, emissao, arquivo)
where f.competencia = v.competencia
  and f.cliente_id = v.cliente_id
  and f.valor = v.valor;
