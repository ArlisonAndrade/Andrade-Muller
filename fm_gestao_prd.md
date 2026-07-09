# FM Gestão e Estratégica — PRD do Software

**Objetivo:** substituir o Notion por um software que a Franciele opera sozinha, com as mesmas informações de hoje (CRM, reuniões, tarefas, faturamento, metas) mais o que o Notion não faz: automação, cálculo automático e dashboard vivo.

**Escopo:** uso interno, single-tenant. Sem portal de cliente (IBVET/IEA já têm o deles). Stack já decidida: Supabase + Next.js (web) + Expo (mobile, se necessário depois). Schema em `fm_gestao_schema.sql`.

**Usuários:** Franciele (operadora principal), Arlison (admin técnico). Sem múltiplos perfis de permissão no MVP — só um nível de acesso.

---

## 1. Módulos do MVP (ordem de prioridade)

### 1.1 CRM + Funil de Vendas — prioridade 1
- Lista/Kanban de clientes por status: lead → prospecção → proposta → negociação → cliente ativo → inativo
- Cadastro: empresa, contato, e-mail, WhatsApp, fonte do lead, responsável, tags, último contato
- Funil de negócios: nome do negócio, valor, estágio, data prevista de fechamento, próxima ação
- **Automatiza o que o Notion não faz:** alerta automático de "lead sem próximo contato agendado há X dias" — hoje é pergunta manual do checklist, vira regra do sistema

### 1.2 Reuniões — prioridade 1
- Criar reunião vinculada a um cliente: tipo, data, ata, decisões tomadas, próximos passos
- Busca full-text no histórico (hoje, achar uma decisão antiga no Notion é rolar a página)
- Ações definidas em reunião podem virar tarefa com um clique (webhook interno, não preenchimento duplicado)

### 1.3 Tarefas — prioridade 1
- Lista/Kanban por cliente e por responsável, com prazo e prioridade
- View "minha semana" — o que vence nos próximos 7 dias, cruzando todos os clientes
- **Automatiza:** alerta de tarefa crítica sem responsável definido

### 1.4 Faturamento / NFS-e — prioridade 1
- Fluxo confirmado com o Arlison: a emissão continua manual no portal da prefeitura (não entra Focus NFe/eNotas — ver 3.1). O que o software faz é a parte de dados: ele **importa** a nota já emitida (número, cliente, valor, competência — via upload do XML/PDF ou formulário rápido) e a partir daí **gera sozinho** tudo que hoje é calculado à mão: total do trimestre, status de cada cliente, dashboard de receita, checklist de faturamento lançado
- Como os valores são recorrentes e fixos (R$4.000 IBVET, R$3.500 IEA), o sistema já sugere o lançamento do mês antes de importar — ele só confirma
- Zero digitação duplicada: uma nota importada atualiza automaticamente `fm_faturamento`, a view trimestral e o dashboard, sem precisar editar planilha separada

### 1.5 Contratos — prioridade 2
- Cliente, valor mensal, valor total, vigência, tipo (recorrente/projeto/hora)
- Alerta automático de renovação N dias antes do fim do contrato (isso hoje depende da Franciele lembrar sozinha — é exatamente o tipo de coisa que trava decisão de reprecificação a tempo)

### 1.6 Metas / OKRs — prioridade 2
- Objetivo + key results por trimestre, com progresso numérico

### 1.7 Dashboard — prioridade 2
- Receita por trimestre (gráfico, puxado de `fm_faturamento_trimestral`)
- Pipeline aberto (soma de negócios por estágio)
- Tarefas pendentes e prazos próximos, por cliente
- **O relatório que hoje não existe:** carga de trabalho por cliente (nº de reuniões + tarefas no mês) cruzado com valor cobrado — é o dado que sustenta a reprecificação do IBVET na renovação de setembro

### 1.8 Checklist de Saúde Operacional — prioridade 3
- Os itens do Notion (lead sem contato, proposta sem follow-up, tarefa crítica sem responsável, faturamento lançado, reunião sem ata) deixam de ser um formulário semanal manual e viram indicadores calculados automaticamente toda segunda-feira

---

## 2. Fora de escopo (decisão já tomada)

- Portal de cliente para IBVET/IEA
- Multi-tenant / vender como SaaS para outras consultorias
- Cobrança automática via PIX/boleto (contratos são faturados via NFS-e direto, sem gateway de pagamento por ora)
- Qualquer funcionalidade de agendamento self-service para cliente (não apareceu como dor no Notion real)

## 3. Integrações (fase 2, não MVP)

### 3.1 Emissão automática de NFS-e — Focus NFe ou eNotas

| | Focus NFe | eNotas |
|---|---|---|
| Plano de entrada | R$ 109/mês (200 docs, R$0,65/doc extra) | R$ 137/mês (até 50 notas) |
| Setup | Sem taxa (R$199 só se a prefeitura ainda não for suportada) | — |
| Fidelidade | Nenhuma | — |

**Não recomendo contratar isso ainda.** O volume real hoje é de 3 a 5 notas fixas por mês (IBVET, IEA, Juliana, eventualmente mais uma). Pagar R$109-137/mês para automatizar uma tarefa de ~15 minutos mensais não fecha conta — o ROI que a eNotas divulga (payback em 30 dias) é calculado para quem emite 30+ notas/mês. Passo mais barato: o próprio software já pré-preenche o valor da nota do mês (módulo 1.4 do MVP); o n8n manda um lembrete automático no 5º dia útil (e-mail ou mensagem pessoal, custo zero) e ela emite direto no portal da prefeitura em poucos minutos. Reavaliar Focus NFe quando o número de clientes recorrentes passar de ~8-10/mês.

### 3.2 Lembretes automáticos — depende de para quem é o lembrete

- **Lembrete pra ela mesma** (emitir NFS-e, renovação de contrato chegando): não precisa de WhatsApp Business API. E-mail ou notificação via n8n já resolve, sem custo e sem a burocracia de aprovação de conta Meta Business.
- **Lembrete pro cliente** (ex: confirmar reunião): aí sim justificaria WhatsApp Business API — mas as reuniões com IBVET/IEA já são recorrentes em horário fixo semanal (ex: segunda 14h), então a necessidade real de lembrete automático pro cliente é baixa hoje. Não priorizar isso — WhatsApp Business API exige número dedicado, aprovação de template na Meta e custo por conversa fora do free tier, complexidade desproporcional ao problema atual.

### 3.3 Google Calendar

- Baixo custo/complexidade (API gratuita do Google) e utilidade concreta: toda reunião criada no sistema empurra um evento pro Google Calendar da Franciele, sem digitar duas vezes. Vale entrar ainda na fase 2, antes das outras duas.

## 4. Definição de "pronto" do MVP

O software substitui o Notion de vez quando a Franciele conseguir, sem abrir o Notion:
1. Ver todos os clientes e em que estágio do funil cada um está
2. Registrar uma reunião nova e consultar o histórico de qualquer cliente
3. Ver e marcar tarefas da semana
4. Lançar a NFS-e do mês por cliente
5. Ver a receita trimestral e o pipeline em aberto no dashboard

## 5. Especificação visual (aprovada em 09/jul/2026)

Direção fechada depois de 3 rodadas de mockup. Não usar template pronto (Bootstrap/SCSS pago) — implementar direto em Tailwind com estes tokens.

### 5.1 Paleta
| Papel | Cor | Uso |
|---|---|---|
| Fundo de página | `#F1EADA` (marfim/parchment) | Substitui o branco puro genérico de SaaS |
| Cartão | `#FFFDF8` | Fundo dos cards — branco quente, não branco frio |
| Texto primário | `#2B2A25` | Corpo de texto |
| Texto secundário | `#8A8874` / `#6B6A5F` | Labels, legendas de eixo |
| Destaque (bronze) | `#B8925A` | Faturamento, linha de destaque, badge do monograma |
| Marinho | `#1F3347` | Identidade primária (IBVET nos gráficos, ícone de moeda) |
| Sálvia | `#4C6B50` | Estados "ativo"/positivo (IEA, renovação) |
| Terracota/vinho | `#8C4A5E` | Alertas e métricas secundárias (não vermelho puro) |
| Divisórias | `#EDE7D6` | Grid de gráfico, tracks de barra de progresso |

### 5.2 Tipografia
- Display/números: **Fraunces** (serifada, ecoa o monograma "FM") — só em números grandes e títulos de card
- Corpo/UI: **Inter** — labels, tabelas, navegação
- Nunca serifada em blocos de texto longo ou tabelas densas

### 5.3 Padrão de componente
- Cards individuais, sombra leve (`box-shadow: 0 1px 3px rgba(43,42,37,.10)`), `border-radius: 12px`, sem bordas fortes — não o painel único "colado" testado na 2ª rodada
- Cartão de indicador (KPI): ícone circular com tinta suave (não cor viva saturada) + label pequeno + número grande em Fraunces
- Gráficos (Chart.js): área para tendência de faturamento, barras para comparação por cliente, radar para saúde operacional (mapeia direto no checklist do Notion: leads em dia, propostas com follow-up, tarefas com responsável, faturamento lançado, atas documentadas), barra de progresso para metas/OKRs
- Cor por categoria, não por ordem: marinho = IBVET, bronze = IEA, sálvia = clientes menores — consistente em todos os gráficos, nunca aleatório

## 6. Próximo passo

Abrir este PRD junto com `fm_gestao_schema.sql` e `kickoff_andrade_muller.md` no Claude Code para começar a construção (Next.js + Tailwind + Supabase, conforme decisão de arquitetura já registrada, com os tokens visuais da seção 5).
