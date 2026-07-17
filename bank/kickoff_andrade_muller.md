# Andrade&Muller — Documento de Kickoff

**Objetivo do projeto:** construir um ecossistema de apps (financeiro família + CNPJ + Carteira Arthur + FM Gestão) validando arquitetura e processo antes de vender algo semelhante como produto.

**Ambiente de teste:** paralelo ao IBVet (pausado). Serve como segundo ciclo de aprendizado de desenvolvimento full-stack.

---

## 1. Ordem de construção

1. **FM Gestão e Estratégia** ← módulo atual, começando agora
2. Andrade&Muller Bank (Família + CNPJ)
3. Carteira do Arthur
4. Unificação num painel único (Andrade&Muller) com troca de workspace

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
- [ ] Exportar dados atuais da Franciele: Notion (clientes, tarefas, status) + Excel (abas, colunas, lógica de controle)
- [ ] Mapear "abas e estilo" — como ela organiza hoje, pra não perder nenhuma categoria/processo no novo sistema
- [ ] Levantar **necessidades não atendidas hoje** — o que ela sente falta e não executa no Notion/Excel atual (esse é o diferencial do app novo)
- [ ] Consolidar tudo em 1 CSV limpo por tabela (clientes, entregas, tarefas) pronto pra import
- [ ] Reunir tudo num briefing único de entrega para o Code (não gerar código solto aqui)

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

## 8. Decisões finais antes do Code

- **Carteira do Arthur não é módulo independente** — é uma seção dentro do Bank (mesma entidade `carteira_infantil`, mesma navegação, acento de cor próprio dentro da tela)
- **Cada módulo tem identidade visual própria**: Bank já tem logo e tokens definidos (ver `design_tokens.md` e `logo_andrade_muller_bank.svg`); FM Gestão terá a sua definida separadamente quando entrar em desenvolvimento
- **Direção visual do Bank**: estilo minimalista inspirado na Avenue — serifa nos números de destaque, muita área branca, cards com borda fina em vez de sombra, zero gradiente
- **Fatura de cartão**: import mensal via OFX/CSV, com categorização automática por regras de texto (`regras_categorizacao`) e revisão manual do que não casar
- Script de import CSV/OFX → Supabase: escrever no Code, depois que o template estiver plugado

## 9. Pacote de arquivos para o Code

| Arquivo | Conteúdo |
|---|---|
| `schema.sql` | Entidades, contas, transações, dívidas, metas, investimentos B3 |
| `fm_gestao_schema.sql` | Clientes, entregas, tarefas, horas, interações (módulo consultoria) |
| `bank_extras_schema.sql` | Ponte de renda mensal, cartões/faturas, categorização automática, planejamento semanal |
| `design_tokens.md` | Tipografia, cores, componentes — direção visual do Bank |
| `logo_andrade_muller_bank.svg` | Logo aprovada, escalável |
| Template React/HTML auditado no Cowork | Base de UI |
| CSVs extraídos do Notion/Excel da Franciele | Dados para import único do FM Gestão |
