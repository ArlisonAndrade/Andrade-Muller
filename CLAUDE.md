# Andrade&Muller — FM Gestão e Estratégica

MVP interno (single-tenant) que substitui o Notion da consultoria da Franciele. Não é portal de cliente, não é multi-tenant, não é SaaS para terceiros.

## Documentos de referência (ler antes de mexer)
- `fm_gestao_prd.md` — PRD com módulos, prioridades e especificação visual (seção 5)
- `fm_gestao_schema.sql` — schema aprovado, rodado como está (não redesenhar)
- `kickoff_andrade_muller.md` — decisões de arquitetura e dados reais
- `schema.sql` — módulo financeiro (Família/CNPJ/Carteira Arthur), ainda não rodado. Atenção: o check de `entidades.tipo` dele não inclui `'consultoria'` — o `00_base.sql` já cria as tabelas base com o check corrigido; ao rodar o schema.sql completo, trocar os `create table` de entidades/membros/entidade_membros por `create table if not exists`.

## Estrutura
- `web/` — Next.js 16 (App Router) + Tailwind v4 + Chart.js. Tokens visuais em `web/app/globals.css` (`@theme`) — usar somente essas cores/fontes.
- `supabase/migrations/` — rodar em ordem no SQL Editor do projeto Supabase: `00_base.sql` (entidades mínimas), `01_fm_gestao.sql` (cópia verbatim do schema), `02_rls_policies.sql`, `03_seed.sql` (dados reais).
- Mobile (`/mobile`) fica para depois da unificação — não criar agora.

## Stack (decidida, não debater)
Next.js + Tailwind no web; Supabase (Postgres + RLS) como backend; Chart.js para gráficos; deploy Vercel. Fontes: Fraunces (números grandes/títulos de card) + Inter (resto).

## Ordem de construção (PRD seção 1 — não pular etapa)
1. ✅ Setup (Next + Tailwind + Supabase + migrations + shell)
2. CRM + Funil de Vendas
3. Reuniões
4. Tarefas
5. Faturamento/NFS-e — importação de nota já emitida (emissão continua manual na prefeitura)
6. Dashboard (gráficos da seção 5.3: área faturamento, barras por cliente, radar saúde, progresso metas)
7. Contratos e Metas/OKRs
8. Checklist de Saúde Operacional

## Cores por categoria (consistente em todos os gráficos, nunca aleatório)
marinho `#1F3347` = IBVET · bronze `#B8925A` = IEA/destaque · sálvia `#4C6B50` = clientes menores/positivo · terracota `#8C4A5E` = alerta

## Fora de escopo — não sugerir
Portal de cliente (IBVET/IEA), multi-tenant, cobrança via gateway, emissão automática de NFS-e (Focus NFe/eNotas).

## Convenções
- Trabalhar em incrementos pequenos e testáveis (sessões de 30–60 min)
- Idioma da UI e do código de domínio: português (tabelas e campos já são pt-BR)
- RLS por entidade via `entidade_membros` — toda tabela nova segue o padrão de `02_rls_policies.sql`
- O caminho do projeto contém `&` e espaços — sempre citar caminhos em comandos de shell
