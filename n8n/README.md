# Consultor financeiro no Telegram — instalação (Fase A)

O grupo da família no Telegram vira um canal de lançamento do Bank. Quem manda
"mercado 230 no nubank" recebe de volta a confirmação, o status da semana e uma
frase do consultor — e o gasto aparece no extrato em `/bank/lancamentos`.

```
Grupo Telegram ──► n8n ──► POST /api/bank/agente/mensagem
                    ▲                    │
                    └── texto da resposta ┘ (Claude interpreta,
                                             app grava em transacoes)
```

> **Onde isso roda hoje** (desde 19/ago/2026): VPS própria da Hostinger,
> `https://n8n-dmu8.srv1913873.hstgr.cloud`. Migrado do n8n compartilhado que
> hospedava a Nina e a Agenda (`teste01-n8n.snm8u2.easypanel.host`). O compose
> que está rodando lá é o `docker-compose.vps.yml` deste diretório — o template
> original da Hostinger trazia labels de Traefik sem Traefik instalado, então
> nada atendia em 443 e o Telegram não conseguia entregar os webhooks; o Caddy
> entrou no lugar. Passo a passo da migração em `MIGRACAO-VPS.md`.
>
> O Passo 2 (subir o n8n) só interessa se um dia for preciso recriar do zero.

O n8n é só o canal. Toda a regra — quem pode falar, como categorizar, o que
responder, o que impede lançamento duplicado — vive no `web/`, versionada junto
com o resto do Bank. Isso evita ter duas verdades sobre o mesmo dinheiro.

---

## Passo 1 — Criar o bot no BotFather

No Telegram, fale com **@BotFather**:

1. `/newbot` → escolha um nome e um usuário (ex.: `andrade_muller_bot`).
2. Guarde o token que ele devolve (`123456:ABC-...`). É o `TELEGRAM_BOT_TOKEN`.
3. **`/setprivacy` → escolha o bot → `Disable`.**

O passo 3 é o que quase todo mundo esquece. Com privacy mode **ligado** (o
padrão), o bot só enxerga mensagens que começam com `/` ou que respondem
diretamente a ele — o resto da conversa do grupo fica invisível e o consultor
nunca vê "mercado 230". Confirme depois em `/mybots → seu bot → Bot Settings →
Group Privacy`: tem que estar **Privacy mode is disabled**.

Depois disso, adicione o bot ao grupo onde você, a Franciele e ele vão conversar.

---

## Passo 2 — Subir o n8n (só se for recriar do zero)

> Já existe um n8n rodando com o workflow instalado. Pule para o Passo 3.

O Telegram Trigger registra um webhook e o Telegram **só aceita HTTPS com
domínio válido** — então o n8n precisa de um domínio apontando para a VPS. Aponte
um subdomínio (ex.: `n8n.seudominio.com.br`) para o IP da VPS antes de começar.

Na VPS, com Docker instalado:

```bash
mkdir -p ~/n8n && cd ~/n8n
```

Crie o `docker-compose.yml` (o Caddy cuida do certificado sozinho):

```yaml
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    environment:
      - N8N_HOST=n8n.seudominio.com.br
      - WEBHOOK_URL=https://n8n.seudominio.com.br/
      - N8N_PROTOCOL=https
      - N8N_PORT=5678
      - GENERIC_TIMEZONE=America/Sao_Paulo
      - TZ=America/Sao_Paulo
      - N8N_ENCRYPTION_KEY=<gere com: openssl rand -hex 32>
      # Usadas pelo workflow:
      - ANDRADE_MULLER_URL=https://andrademuller.vercel.app
      - BANK_AGENTE_SECRET=<o mesmo segredo do Passo 3>
      - TELEGRAM_BOT_TOKEN=<token do BotFather>
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  caddy_data:
  n8n_data:
```

E o `Caddyfile`:

```
n8n.seudominio.com.br {
  reverse_proxy n8n:5678
}
```

Suba com `docker compose up -d` e abra `https://n8n.seudominio.com.br` para
criar a conta de dono do n8n.

> Toda vez que mudar uma variável de ambiente é preciso `docker compose up -d`
> de novo — o n8n só lê `$env` na subida do container.

---

## Passo 3 — Variáveis no app (Vercel)

Em **Vercel → projeto `web` → Settings → Environment Variables**, confirme/adicione:

| Variável | Para quê |
|---|---|
| `BANK_AGENTE_SECRET` | segredo compartilhado com o n8n. Gere com `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | a interpretação das mensagens (já existe, se a análise de reunião do FM está funcionando) |
| `SUPABASE_SERVICE_ROLE_KEY` | o agente grava sem sessão de browser (Supabase → Settings → API → `service_role`) |

Faça um redeploy depois de adicionar. Para testar local, as mesmas três vão no
`web/.env.local`.

---

## Passo 4 — Rodar a migration ✅ (já aplicada em 30/jul/2026)

No SQL Editor do Supabase, cole e rode
`bank/supabase/migrations/13_telegram_agente.sql`. Ela é idempotente — rodar
duas vezes não quebra nada.

---

## Passo 5 — Credenciais e ativação do workflow

O workflow já existe no n8n. Falta ligá-lo às credenciais — o segredo do app
mora numa credencial do n8n, não dentro do workflow, para não virar texto plano
num JSON versionado.

1. **Credentials → Add credential → Header Auth**, nome
   `Bank Agente (Authorization Bearer)`:
   - **Name**: `Authorization`
   - **Value**: `Bearer <o mesmo BANK_AGENTE_SECRET do Passo 3>` (com o
     `Bearer ` na frente, espaço incluso)
2. Abra o workflow e confira as credenciais dos nós:
   - **Chamar o app** → Credential for Header Auth → a que você acabou de criar
   - **Telegram (grupo)**, **Confirmar o clique**, **Responder no grupo** → a
     credencial do bot (`Telegram Arkad`)
3. **Ative** o workflow (chave no canto superior direito). É a ativação que
   registra o webhook no Telegram — em modo de teste ele só escuta um evento.

Fluxo dos nós:

```
Telegram (grupo) → Normalizar → Clicou em desfazer?
                                  ├ sim → Confirmar o clique ─┐
                                  └ não → Tem foto?           │
                                            ├ sim → Foto em base64 ─┤
                                            └ não ──────────────────┤
                                                                    ▼
                              Responder no grupo ← Vale responder? ← Chamar o app
```

> ⚠ **Rascunho ≠ versão publicada.** Esta instância guarda as duas coisas.
> Salvar o workflow (ou atualizá-lo pela API) mexe só no rascunho: o que roda
> em produção continua sendo a versão publicada. Depois de qualquer mudança,
> **publique** — senão o comportamento novo simplesmente não acontece, sem
> nenhum erro visível. Foi o que quase engoliu o caminho da foto em
> 01/ago/2026.

`telegram-consultor.json` é o workflow que está rodando. Para reimportar
depois de uma mudança: **Workflows → ⋮ → Import from File**, ou abra o
workflow, selecione tudo (Ctrl+A), apague e cole o JSON (Ctrl+V). As
credenciais precisam ser reconferidas depois de qualquer import.

## Foto de cupom

O `Telegram (grupo)` está com **Download Image/File** ligado e tamanho
`large` — sem isso só chega o `file_id` e a foto nunca vira imagem para o
modelo. O `Normalizar` devolve o binário de propósito (o Code node descarta
binário que não é retornado), o `Foto em base64` converte para string e o
`Chamar o app` manda `imagem_base64` junto do corpo normal.

Um cupom vira **um** lançamento com o total pago — não item a item. A
legenda da foto, quando existe, manda mais que a leitura do modelo: mandar a
foto com "mercado" escrito embaixo resolve categoria ambígua. Total ilegível
não é chutado: o bot pergunta.

---

## Passo 6 — Cadastrar quem pode falar

Mande qualquer mensagem no grupo. O bot vai responder:

```
Ainda não te conheço, então não registrei nada.
chat_id: -1001234567890
user_id: 111111111
```

Peça para a Franciele mandar uma também, para pegar o `user_id` dela. Depois
abra o final da migration 13 — tem um bloco `insert` comentado — troque os
números pelos reais e rode no SQL Editor. A partir daí o bot passa a lançar.

---

## Passo 7 — Meta da semana (opcional)

Sem meta cadastrada o bot responde "Semana (seg–dom): R$ 680,00 gastos". Com
meta, ele mostra a régua e quanto falta. Até a tela da Fase B existir, dá para
cadastrar no SQL Editor:

```sql
insert into semanas_orcamento (entidade_id, semana_inicio, meta)
values ('b0000000-0000-0000-0000-000000000001', '2026-07-27', 1000)
on conflict (entidade_id, semana_inicio) do update set meta = excluded.meta;
```

`semana_inicio` é sempre a **segunda-feira** da semana.

---

## Testar sem o Telegram

```bash
curl -X POST https://andrademuller.vercel.app/api/bank/agente/mensagem -H "Authorization: Bearer $BANK_AGENTE_SECRET" -H "Content-Type: application/json" -d '{"chat_id":-1001234567890,"message_id":999001,"user_id":111111111,"nome":"Arlison","texto":"mercado 230 no nubank"}'
```

O retrato financeiro que os resumos agendados da Fase C vão usar:

```bash
curl https://andrademuller.vercel.app/api/bank/agente/contexto -H "Authorization: Bearer $BANK_AGENTE_SECRET"
```

Cada `message_id` só é processado uma vez — para repetir o teste, mude o número.

---

## Quando algo não funciona

| Sintoma | Causa provável |
|---|---|
| O bot não reage a nada no grupo | Privacy mode ligado no BotFather (Passo 1.3), ou o workflow não está **ativo** |
| Só reage quando você responde a ele | Mesmo caso: privacy mode |
| `401 não autorizado` no nó HTTP | `BANK_AGENTE_SECRET` diferente entre a Vercel e o n8n |
| `501 SUPABASE_SERVICE_ROLE_KEY não configurada` | falta a variável na Vercel (e redeploy depois de adicionar) |
| Responde "Ainda não te conheço" mesmo depois do cadastro | `chat_id` do grupo é negativo — confira o sinal na linha inserida |
| Lançou com a data errada | o app usa America/Sao_Paulo, mas confira `TZ` no container do n8n |
| O botão "desfazer" fica girando | o nó **Confirmar o clique** está sem credencial do Telegram |

Logs úteis: `docker compose logs -f n8n` na VPS, e **Vercel → Deployments →
Runtime Logs** para o lado do app (os erros saem com o prefixo `[agente/...]`).

---

## Migração de instância — o que quebra (aprendido em 19/ago/2026)

Quatro coisas quebraram na mudança para a VPS própria, nesta ordem de descoberta:

1. **Nada respondia em 443.** O template da Hostinger trazia labels `traefik.*`
   mas o Traefik não estava instalado — o n8n rodava sozinho numa porta
   aleatória. Telegram Trigger é webhook: sem porta aberta, nenhum workflow
   funciona, por mais correto que esteja. Resolvido com o Caddy
   (`docker-compose.vps.yml`).
2. **Credenciais não migram** — a chave de criptografia fica no container
   antigo. Recriar na mão.
3. **Ao reatribuir credencial, é fácil pegar a errada da lista.** Foi o que
   aconteceu: os nós HTTP ficaram com `predefinedCredentialType: supabaseApi`
   em vez de `httpHeaderAuth`, e o app respondia `401 não autorizado` — erro
   que parece de segredo errado, mas era de tipo de autenticação.
4. **`Bearer` é do n8n, não da Vercel.** Na Vercel vai só o segredo; no campo
   Value do Header Auth vai `Bearer ` + o segredo. A interface nova da Vercel
   **não deixa reler** o valor de uma variável (o `sk_live_a12…` cinza é
   placeholder, não conteúdo) — se perder, gere outro e **redeploy**, senão o
   app continua rodando com o valor velho.

E o de sempre: o Telegram aceita **um webhook por bot**. Desativar no antigo
antes de ativar no novo.
