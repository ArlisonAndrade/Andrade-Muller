# Andrade Muller — FM Gestão e Estratégica

MVP interno (single-tenant) que substitui o Notion da consultoria da Franciele. Não é portal de cliente, não é multi-tenant, não é SaaS para terceiros.

## Documentos de referência (ler antes de mexer)
- `fm_gestao_prd.md` — PRD com módulos, prioridades e especificação visual (seção 5)
- `fm_gestao_schema.sql` — schema aprovado, rodado como está (não redesenhar)
- `kickoff_andrade_muller.md` — decisões de arquitetura e dados reais
- `schema.sql` — módulo financeiro (Família/CNPJ/Carteira Arthur), ainda não rodado. Atenção: o check de `entidades.tipo` dele não inclui `'consultoria'` — o `00_base.sql` já cria as tabelas base com o check corrigido; ao rodar o schema.sql completo, trocar os `create table` de entidades/membros/entidade_membros por `create table if not exists`.

## Estrutura
- `web/` — Next.js 16 (App Router) + Tailwind v4 + Chart.js. Tokens visuais em `web/app/globals.css` (`@theme`) — usar somente essas cores/fontes.
- `supabase/migrations/` — rodar em ordem no SQL Editor do projeto Supabase (00→07). A partir da 06, o Financeiro usa categorias/contas/transacoes (estrutura do schema.sql financeiro) com coluna extra grupo_dre; a 07 carrega os dados reais migrados da planilha da Franciele (fonte: Google Sheets, jul/2026). fm_faturamento = notas (competência); transacoes = impostos/despesas/destinação.
- Mobile do FM Gestão (`/mobile`) fica para depois da unificação — não criar agora. (O `bank/mobile` é um app Expo separado, do módulo Bank — ver seção própria abaixo.)
- **Projetos (clientes micro)**: fm_projetos + fm_templates_tarefas (Biblioteca migrada do Notion, 11/jul/2026); criar projeto gera o cronograma automaticamente. Cliente macro (IBVET/IEA) mantém tarefas/entregas nos portais próprios — no sistema ficam só reuniões + financeiro (entrevista de 11/jul/2026).
- **Análise de reunião por IA** (lib/acoes/analise.ts): cola transcrição ou resumo → Claude API (claude-opus-4-8, structured outputs) gera ata + tarefas + próxima reunião → revisão com 1 clique. Requer ANTHROPIC_API_KEY no web/.env.local (server-side).

## Stack (decidida, não debater)
Next.js + Tailwind no web; Supabase (Postgres + RLS) como backend; Chart.js para gráficos; deploy Vercel. Fontes: Fraunces (números grandes/títulos de card) + Inter (resto).

## Ordem de construção (PRD seção 1 — não pular etapa)
1. ✅ Setup (Next + Tailwind + Supabase + migrations + shell)
2. ✅ CRM + Funil de Vendas
3. ✅ Reuniões
4. ✅ Tarefas
5. ✅ Faturamento/NFS-e — importação manual + extrato OFX (emissão continua manual na prefeitura)
6. ✅ Dashboard (gráficos da seção 5.3: área faturamento, barras por cliente, radar saúde, progresso metas)
7. ✅ Contratos e Metas/OKRs
8. ✅ Checklist de Saúde Operacional
**Login: unificação em vigor** (decisão do Arlison, 14/jul/2026 — substitui a decisão de 10/jul). O painel Andrade Muller ganhou tela de entrada própria (`web/app/(entrada)/`, visual heráldico Cinzel/Cormorant Garamond, à parte dos tokens do FM Gestão) e `web/middleware.ts` fecha o acesso: único ponto de entrada é `/entrar` (Google via Supabase Auth), toda rota fora de `/entrar` e `/auth/callback` exige sessão. Hub (`/hub`) lista os ambientes do ecossistema; FM Gestão aponta pra `/`.
- Pendente antes de publicar: dropar as policies `dev_anon_*` (script no fim de `04_dev_acesso_anon.sql`) — mas só depois que a Franciele logar pelo menos uma vez (pega o `id` dela em `auth.users`) e esse `id` for inserido em `entidade_membros`; dropar antes disso bloqueia todo o acesso a dados, mesmo autenticada.
- `web/lib/supabase/middleware.ts` faz o `getUser()` por request; qualquer rota nova nasce protegida por padrão, não precisa lembrar de nada por página.
- **Ecossistema unificado num app só** (decisão do Arlison, 19/jul/2026 — substitui a de 14–15/jul de manter o Bank como app/deploy separado). O Bank virou a seção `/bank` dentro do `web/` (mesmo domínio, mesmo login/cookie, um único deploy Vercel com Root Directory = `web`). Isso eliminou a gambiarra de SSO por magic-link entre domínios `.vercel.app` (rota `bank-sso`/`auth/handoff` e as vars `NEXT_PUBLIC_BANK_URL`/`NEXT_PUBLIC_FM_URL`/`SUPABASE_SERVICE_ROLE_KEY`, todas removidas). Fluxo: `/entrar` → `/hub` → escolhe FM (`/`) ou Bank (`/bank`).

**Google Agenda — sincronização de reuniões** (decisão do Arlison, 12/jul/2026, antecipando OAuth do Google *só para calendário*): migration `09_google_agenda.sql` + `web/lib/google/` (oauth.ts, calendar.ts) + rotas `web/app/api/google/{connect,callback}`. É uma *conexão de integração* (refresh token guardado em `fm_google_integracao`), separada do login do painel — mas pode usar o **mesmo client OAuth** do Google Cloud Console (basta ter as duas redirect URIs cadastradas nele, ver `web/.env.local.example`). OAuth roda em dev com `redirect_uri` em `localhost` e app OAuth em modo "Testing", sem publicar. Saída (reunião → evento) roda nos server actions de reuniões; entrada (Google → reunião) é pull por `syncToken` no botão "Sincronizar" (webhook em tempo real fica para quando o app tiver URL pública). Requer `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` no `web/.env.local`. ⚠ Os tokens ficam legíveis pelas policies `dev_anon_*` até elas serem dropadas (ver acima).

## Módulo Bank (Andrade Muller Bank — fase 3, iniciada 15/jul/2026)
Painel de controle financeiro familiar (Família + CNPJ + Carteira Arthur). **Roda no MESMO projeto Supabase do FM Gestão** (decisão do Arlison, 15/jul/2026 — não deu pra criar projeto novo; isso na verdade bate com a decisão original do kickoff: "1 backend Supabase, N entidades isoladas por RLS", não 3 backends separados). A entidade "CNPJ" do Bank **é** a mesma entidade `consultoria` que já fatura no FM Gestão (`a0000000-0000-0000-0000-00000000f001`) — a visão CNPJ do Bank mostra as mesmas categorias/transações de DRE/Fator R já lançadas no Financeiro (Pró-Labore, DAS, ISSQN etc.), não um livro à parte.
- Documentos de referência: `bank/schema.sql` (entidades/contas/transações/dívidas/metas/investimentos B3), `bank/bank_extras_schema.sql` (ponte de renda mensal, cartões/faturas, planejamento semanal, regras de categorização), `bank/design_tokens.md` (direção visual "Avenue"), `bank/logo_andrade_muller_bank.svg`.
- `bank/supabase/migrations/` — rodar em ordem (00→04) no SQL Editor do **mesmo projeto Supabase do FM Gestão**. `entidades`/`membros`/`entidade_membros`/`categorias`/`contas`/`transacoes` já existem lá (`00_base.sql` + `06_financeiro_base.sql`) — as migrations do Bank usam `create table if not exists` pra essas e só criam do zero o que falta (dívidas, metas, investimentos B3, cartões/faturas, ponte de renda). RLS e `dev_anon_*` dessas tabelas compartilhadas também já existem (mesmos nomes de policy) — as do Bank só cobrem as tabelas novas. Seed (`03_seed.sql`) só insere as entidades Família e Carteira Arthur — CNPJ reaproveita a entidade `consultoria` existente.
- **Interface: agora vive dentro do `web/`** (fusão 19/jul/2026 — ver seção Login). Páginas em `web/app/bank/**` (rotas `/bank/...`), componentes em `web/components/bank/**`, lib em `web/lib/bank/**`. `web/app/bank/layout.tsx` escopa o visual "Avenue" (fundo branco, Nav do Bank, serifa Source Serif 4, cards com borda 0.5px sem sombra, zero gradiente) num wrapper, sem vazar sobre o parchment do FM. Tokens do Bank ficam no `web/app/globals.css` (nomes de cor disjuntos dos do FM — `surface/text/border/arthur` — então coexistem; **não** há `body{}` global do Bank). Reusa o `web/lib/supabase/server.ts` do FM (mesmo cliente). A pasta `bank/` guarda só referência: `schema.sql`, `supabase/migrations/`, `design_tokens.md`, o SVG da logo e o app `mobile/` — **não existe mais `bank/web/`**.
- `bank/mobile/` — Expo SDK 57 + TypeScript, mesmo backend Supabase via `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` (mesmos valores de `web/.env.local.example`). Ainda é só a tela home (ações rápidas mostram placeholder); telas de lançamento/transferência/import ficam para a próxima etapa do mobile.
- Home screen (única tela desta fase): seletor Consolidado/Família/CNPJ, hero de patrimônio, próxima fatura, ponte pró-labore (só Consolidado, via `transacao_vinculada_id` — o lado CNPJ usa as categorias reais "Pró-Labore (Bruto)"/"Pagamento de Dividendos" da DRE), 3 ações rápidas, orçamento 50/30/20 (só Família), investimentos B3 (`view posicao_ativos`), Carteira Arthur (acento de cor próprio, sempre visível), metas ativas, transações recentes.
- **Fora de escopo nesta fase** (decisão explícita, 15/jul/2026): parser de import OFX/CSV de fatura e Edge Function de insights por IA — a página `/importar-fatura` é só um placeholder.
- Deploy: **um único projeto Vercel** (Root Directory = `web`, repo `ArlisonAndrade/Andrade-Muller`) serve FM + Bank juntos — o Bank não tem mais deploy próprio. EAS Build para `bank/mobile` (`bank/mobile/eas.json`, bundle id `com.andrademuller.bank`) segue separado. Ambos exigem login nas contas do usuário, não automatizável por aqui.
- ⚠ Rodar `npx`/`expo`/`tsc` direto (sem `node node_modules/<pkg>/bin/...`) quebra nesta máquina por causa do `&` no caminho do projeto (o shim `.bin` do Windows corta o comando no `&`) — sempre invocar o entrypoint JS diretamente, ex. `node node_modules/typescript/bin/tsc`.

## Cores por categoria (consistente em todos os gráficos, nunca aleatório)
marinho `#1F3347` = IBVET · bronze `#B8925A` = IEA/destaque · sálvia `#4C6B50` = clientes menores/positivo · terracota `#8C4A5E` = alerta

## Fora de escopo — não sugerir
Portal de cliente (IBVET/IEA), multi-tenant, cobrança via gateway, emissão automática de NFS-e (Focus NFe/eNotas).

## Convenções
- Trabalhar em incrementos pequenos e testáveis (sessões de 30–60 min)
- Idioma da UI e do código de domínio: português (tabelas e campos já são pt-BR)
- RLS por entidade via `entidade_membros` — toda tabela nova segue o padrão de `02_rls_policies.sql`
- O caminho do projeto contém `&` e espaços — sempre citar caminhos em comandos de shell
