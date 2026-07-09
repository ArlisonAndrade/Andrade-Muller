Estou abrindo este projeto pela primeira vez no Claude Code. Antes de escrever qualquer código, leia os 3 arquivos na raiz do projeto:
- kickoff_andrade_muller.md
- fm_gestao_schema.sql
- fm_gestao_prd.md

**Objetivo:** construir o MVP do "FM Gestão e Estratégica" — software interno (single-tenant) que substitui o Notion da consultoria da Franciele. Não é portal de cliente, não é multi-tenant, não é produto pra vender pra terceiros por enquanto.

**Stack decidida (não abrir para debate):** Next.js + Tailwind CSS no web, Supabase (Postgres + RLS) como backend. Schema já pronto em `fm_gestao_schema.sql` — rodar como está, não redesenhar do zero.

**Especificação visual já fechada (seção 5 do PRD) — usar exatamente esses tokens, não usar template pronto nem inventar paleta nova:**
- Fundo `#F1EADA`, cards `#FFFDF8` com sombra leve (`box-shadow: 0 1px 3px rgba(43,42,37,.10)`), `border-radius: 12px`
- Fraunces (serifada) para números grandes e títulos de card; Inter para o resto (labels, tabela, navegação)
- Cores por categoria, sempre consistentes: marinho `#1F3347` (IBVET), bronze `#B8925A` (IEA / destaque / faturamento), sálvia `#4C6B50` (positivo/ativo), terracota `#8C4A5E` (alerta/secundário)
- Gráficos: área para tendência de faturamento, barras para comparação por cliente, radar para saúde operacional, barra de progresso para metas

**Ordem de construção (seguir a prioridade do PRD, seção 1 — não pular etapa):**
1. Setup do projeto: Next.js + Tailwind + conexão Supabase; rodar `fm_gestao_schema.sql` no projeto Supabase
2. CRM + Funil de Vendas (prioridade 1)
3. Reuniões (prioridade 1)
4. Tarefas (prioridade 1)
5. Faturamento/NFS-e — importação de nota já emitida (upload/formulário), não emissão automática (ver PRD 1.4 e 3.1)
6. Dashboard (prioridade 2) — usar exatamente os componentes de gráfico validados (seção 5.3 do PRD)
7. Contratos e Metas/OKRs (prioridade 2)
8. Checklist de Saúde Operacional (prioridade 3)

**Fora de escopo agora — não sugerir nem implementar:**
- Portal de cliente pra IBVET/IEA (já têm portal próprio)
- Multi-tenant / arquitetura pra vender como SaaS
- Cobrança automática via PIX/gateway de pagamento
- Emissão automática de NFS-e via Focus NFe/eNotas (volume baixo não justifica o custo ainda — ver PRD 3.1)

**Dados reais de referência para popular/testar (não são fictícios, vieram do Notion e da planilha da empresa):**
- IBVET — R$4.000/mês, contrato R$48.000/ano
- IEA — R$3.500/mês, contrato R$42.000/ano
- Juliana Azevedo Gonçalves — R$80-120/mês, renovação em negociação
- Maria Eduarda — cliente ativa, ticket menor
- Faturamento trimestral real: 4T25 R$22.760, 1T26 R$25.185, 2T26 R$23.923

**Forma de trabalhar:** cada etapa deve ser entregável e testável de forma independente, em incrementos pequenos (sessões de 30-60min, trabalho assíncrono). Antes de gerar os arquivos, me dá um plano curto de estrutura de repositório (pastas, convenção de nomes) e confirma comigo antes de começar a codar.
