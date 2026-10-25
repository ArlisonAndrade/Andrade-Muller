-- ============================================================
-- 34 — O ciclo do balanço começa no dia 5 (25/out/2026)
--
-- Convocação no dia 5, cobrança no dia 15 e balanço no dia 25 (só em jan,
-- abr, jul e out — o mês seguinte ao fechamento do trimestre). A linha do
-- trimestre em `balancos_trimestrais` passa a nascer no dia 5, quando as
-- perguntas vão pro grupo — e o parecer do Arkad só é escrito no dia 25, com
-- as decisões já tomadas. Então o parecer deixa de ser obrigatório.
-- Seguro pra rodar mais de uma vez.
-- ============================================================

alter table balancos_trimestrais alter column parecer drop not null;
