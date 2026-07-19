# Andrade Muller — Documento de Kickoff

**Objetivo do projeto:** construir um ecossistema de apps (financeiro família + CNPJ + Carteira Arthur + FM Gestão) validando arquitetura e processo antes de vender algo semelhante como produto.

**Ambiente de teste:** paralelo ao IBVet (pausado). Serve como segundo ciclo de aprendizado de desenvolvimento full-stack.

---

## 1. Ordem de construção

1. **FM Gestão e Estratégia** ← módulo atual, começando agora
2. Andrade Muller Bank (Família + CNPJ)
3. Carteira do Arthur
4. Unificação num painel único (Andrade Muller) com troca de workspace

Cada módulo nasce como uma `entidade` isolada no mesmo backend Supabase — não são apps separados de verdade, então a unificação no passo 4 não exige migração, só shell de navegação.

---

## 2. Decisões de arquitetura já tomadas

| Decisão | Motivo |
|---|---|
| **1 backend Supabase, N entidades isoladas por RLS** (não 3 backends separados) | Evita retrabalho de auth/deploy/design system triplicado |
| **Sem Open Finance (Pluggy/Belvo)** | Volume de negociação baixo (2-3/mês) não justifica custo/complexidade |
| **Cotação B3 via brapi.dev (free tier)** | Cobre a necessidade de preço médio + variação sem mensalidade |
| **Sem fork de Maybe Finance / Firefly III / Actual Budget** | Stack incompatível (Rails/Laravel) com o que você quer aprender (React Native + Supabase); só aproveitamos o *conceito* de partida dobrada, não o código |
| **Ponte Família ↔ CNPJ via `transacao_vinculada_id`** | Pró-labore/distribuição lançado 1x no CNPJ espelha automaticamente na Família — sem lançamento duplicado |
| **Migração Notion/Excel → app: pontual, não sync contínuo** | Depois de pronto, tudo passa a ser feito pelo app; Notion/Excel saem de uso |
| **Automações de integração via n8n** (não código customizado) | Ferramenta já validada no seu stack, evita reinventar |
| **FM Gestão nasce single-tenant, uso interno** (não SaaS multi-tenant) | Decisão de 09/jul/2026. Mais rápido de construir; se um dia fizer sentido vender pra outras consultorias, migra depois |
| **Sem portal de cliente para contas grandes (IBVET/IEA)** | Decisão de 09/jul/2026 — essas contas já usam portal próprio delas; fora de escopo do MVP |
| **Comprar SuiteDash/ferramenta pronta: descartado** | Testado como hipótese, mas o Notion real já é um sistema de agência bem desenhado (CRM, funil, reuniões, financeiro); a decisão virou "software próprio a partir do que já existe", não "comprar substituto" |

---

## 3. Stack

- **Backend:** Supabase (Postgres + RLS + Edge Functions)
- **Mobile:** React Native + Expo
- **Web:** Next.js (reaproveitando o mesmo Supabase)
- **Deploy:** Vercel
- **Automação:** n8n self-hosted
- **Cotações B3:** brapi.dev
- **IA de insights:** Edge Function com chamada à API Claude (cron semanal)

---

## 4. Fase Cowork (preparação — agora)

Checklist do que trazer para o Code depois:

- [ ] Baixar/auditar o template React/HTML escolhido: stack (Next.js? Tailwind?), estrutura de pastas, componentes de dashboard reaproveitáveis
- [x] Exportar dados atuais da Franciele: Notion (clientes, tarefas, status) + Excel (abas, colunas, lógica de controle) — feito em 09/jul/2026 via Claude in Chrome
- [x] Mapear "abas e estilo" — como ela organiza hoje — o Notion real tem: CRM (funil de vendas + base de clientes), Hub Central de Reuniões (atas/decisões/próximos passos por cliente), Hub Central de Tarefas, Financeiro & Faturamento (controle de NFS-e), Metas/OKRs, Checklist de Saúde Operacional, Portais de cliente (só para contas pequenas)
- [x] Levantar **necessidades não atendidas hoje** — ver seção 6.1 abaixo
- [ ] Consolidar tudo em 1 CSV limpo por tabela (clientes, negócios, reuniões, tarefas, faturamento) pronto pra import
- [ ] Reunir tudo num briefing único de entrega para o Code (não gerar código solto aqui)

### 4.1 Achados reais do Notion (09/jul/2026)

Contas ativas e valores reais (fonte: NFS-e emitidas + funil de vendas):

| Cliente | Mensalidade | Contrato/ano | Perfil |
|---|---|---|---|
| IBVET (Instituto Brasileiro de Veterinária) | R$ 4.000 | R$ 48.000 | Conta âncora — envolvimento semanal em marketing, comercial, RH, eventos |
| IEA (Instituto Educacional Araucária) | R$ 3.500 | R$ 42.000 | Conta âncora — mesmo perfil de envolvimento contínuo |
| Juliana Azevedo Gonçalves | R$ 80–120 | renovação em negociação | Mentoria pontual, ticket residual |
| Maria Eduarda | — | fechado | Cliente ativo, ticket menor |
| Fernanda Senske | R$ 1.222,50 | R$ 5.000 (encerrado) | Contrato fechado e perdido em 31/mai/26 |

Faturamento trimestral: 4T25 R$ 22.760 → 1T26 R$ 25.185 → 2T26 R$ 23.923 — estagnado, com melhora recente no lucro real (pró-labore + dividendos) mas ainda abaixo da meta segundo a Franciele/Arlison.

### 4.2 O que o Notion não resolve hoje (motivo real do software)

- Tudo é manual: NFS-e emitida à mão todo mês, dados copiados entre CRM/Reuniões/Tarefas sem automação
- Sem dashboard vivo — os gráficos do Notion são estáticos, não recalculam automações (lembretes, alertas de prazo, geração de fatura)
- Sem histórico estruturado que alimente decisão de reprecificação (volume de reunião x valor cobrado não é visível automaticamente)
- Checklist de saúde operacional é preenchido manualmente toda semana, sem gatilho automático

---

## 5. Fase Code (construção)

- [ ] Criar repositório Git (estrutura mono-repo: `/mobile`, `/web`, `/supabase`)
- [ ] Criar projeto Supabase novo (separado do IBVet)
- [ ] Rodar `schema.sql` (módulo financeiro: entidades, contas, transações, dívidas, metas, investimentos)
- [ ] Rodar `fm_gestao_schema.sql` (módulo consultoria: clientes, entregas, tarefas, horas, interações)
- [ ] `insert into entidades` para criar os registros: Família, CNPJ Smart 360, Carteira Arthur, FM Gestão (consultoria)
- [ ] Plugar o template auditado no Cowork aos dados reais via Supabase client
- [ ] Escrever script de import único (CSV → Supabase) com os dados extraídos no Cowork
- [ ] Configurar deploy Vercel (web) + build Expo (mobile)
- [ ] RLS: policies por entidade (padrão já no schema, replicar para todas as tabelas)

---

## 6. Schemas de referência

Os DDLs completos já foram gerados e devem ser levados para o Code:

- `schema.sql` — módulo financeiro (Família, CNPJ, Carteira Arthur, investimentos B3)
- `fm_gestao_schema.sql` — módulo FM Gestão (clientes, entregas, tarefas, horas, interações, view de dashboard)

---

## 7. Critérios de avaliação do template

Antes de aprovar o template pro Code, validar:

1. **Stack compatível** — React/Next.js puro, sem framework incompatível (Vue/Angular)
2. **Tailwind**, não CSS customizado solto ou styled-components
3. **Shell de dashboard genérico** (sidebar, cards, gráficos, tabelas) — não SaaS vertical pronto (CRM/e-commerce) com estrutura de dados que não é a sua

---

## 8. Próxima decisão pendente

Script de import CSV → Supabase: escrever agora ou só depois que os dados forem extraídos no Cowork?

**Atualização 09/jul/2026:** dados já extraídos (seção 4.1). `fm_gestao_schema.sql` já reescrito com a estrutura real (fm_clientes, fm_negocios, fm_contratos, fm_reunioes, fm_tarefas, fm_faturamento, fm_metas_okrs, fm_checklist_saude). Falta: consolidar CSV de import e abrir no Claude Code para construir.
