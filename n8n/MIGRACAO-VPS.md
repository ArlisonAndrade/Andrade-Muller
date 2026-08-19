# Migração do n8n para a VPS nova — passo a passo

**Situação em 19/ago/2026**: o host novo (`n8n-dmu8.srv1913873.hstgr.cloud`) resolve
no DNS para o IP certo da Hostinger (`187.127.57.136`), mas **nada responde nas
portas 80 e 443** — os pacotes somem (timeout), não voltam "conexão recusada".
Isso é firewall fechado ou serviço fora do ar, não problema de fluxo.

Enquanto essa porta não abrir, **nenhum workflow do Telegram funciona**, por mais
correto que ele esteja: o Telegram Trigger é um webhook, quem bate na porta é o
Telegram, de fora para dentro.

O n8n **antigo** (`teste01-n8n.snm8u2.easypanel.host`) ainda está no ar.

---

## ETAPA 0 — Salvar os workflows do n8n antigo (faça AGORA, no navegador)

O workflow dos resumos automáticos existe **só lá**. Se o servidor antigo cair
antes de você copiar, ele se perde.

1. Abra https://teste01-n8n.snm8u2.easypanel.host e faça login.
2. Menu **Workflows** (lista).
3. Para **cada** workflow da lista — o do consultor, o dos resumos, a Nina, a
   Agenda — clique nos três pontinhos `⋮` à direita do nome → **Download**.
   O navegador baixa um arquivo `.json`.
4. Guarde os arquivos numa pasta que você ache depois (ex.: `Downloads/n8n-backup`).

> Isso salva os workflows, **não** as credenciais. Senha e token não saem no
> download — de propósito. Você vai recriar as credenciais na Etapa 5.

Anote também, do n8n antigo, quais credenciais existem: **Credentials** no menu
lateral. Você vai precisar recriar as mesmas na instância nova.

---

## ETAPA 1 — Entrar na VPS

Você não precisa instalar programa nenhum. A Hostinger tem terminal no navegador.

1. Entre em https://hpanel.hostinger.com
2. Menu de cima: **VPS** → clique no seu servidor (`srv1913873`).
3. Olhe o **status** na página: tem que estar **Running**.
   - Se estiver *Stopped*, clique em **Start** e espere 1–2 minutos. Pode ser
     esse o problema inteiro.
4. Na barra lateral, clique em **Terminal do navegador** (*Browser terminal*).
   Abre uma tela preta esperando comandos. É nela que você digita tudo daqui
   em diante.

> **Atenção**: todos os comandos deste arquivo são para digitar **nessa tela
> preta da VPS** — não no terminal do seu Windows.

---

## ETAPA 2 — Descobrir o que está rodando lá dentro

Digite (ou cole com botão direito) e aperte Enter:

```
docker ps
```

Isso lista os containers ligados. Três resultados possíveis:

**(a) Aparece uma tabela com `n8n` e algo como `traefik` ou `caddy`, e na coluna
PORTS aparece `0.0.0.0:443->443/tcp`**
→ o n8n está rodando e publicando a porta. O problema é firewall: pule para a
ETAPA 3.

**(b) A tabela aparece mas está vazia, ou não tem `n8n`**
→ os containers estão parados. Rode:

```
docker ps -a
```

Se o n8n aparecer aqui com status `Exited`, encontre a pasta do projeto e suba:

```
find / -name "docker-compose.y*ml" -not -path "*/node_modules/*" 2>/dev/null
```

Anote o caminho que ele mostrar (algo como `/root/docker-compose.yml` ou
`/home/n8n/docker-compose.yml`). Entre na pasta e suba — trocando o caminho pelo
seu:

```
cd /root && docker compose up -d
```

Espere ~30 segundos e rode `docker ps` de novo.

**(c) `docker: command not found`**
→ o Docker não está instalado; a instalação do n8n nunca terminou. Nesse caso
me avise antes de continuar — o caminho é diferente (reinstalar o template de
n8n pelo painel da Hostinger).

Se algum container estiver reiniciando sozinho ou você quiser ver o erro:

```
docker logs --tail 50 $(docker ps -aq --filter name=n8n)
```

Copie e me mande o que aparecer se não fizer sentido.

---

## ETAPA 3 — Abrir o firewall

São **dois** firewalls e os dois precisam estar abertos. É o suspeito número um.

### 3a. Firewall do painel Hostinger

1. hPanel → **VPS** → seu servidor → barra lateral **Firewall**.
2. Se houver alguma regra ativa, precisa existir uma que **aceite (Accept)**
   TCP nas portas **80** e **443**, origem **qualquer** (`0.0.0.0/0`).
3. Se não houver nenhuma regra e mesmo assim não funciona, o bloqueio está no
   passo 3b.

### 3b. Firewall de dentro da máquina (no terminal)

```
sudo ufw status
```

- Se responder **`Status: inactive`** → não é ele, siga para a Etapa 4.
- Se responder `Status: active` e **não** listar `80` e `443` como `ALLOW`,
  libere:

```
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload
```

Cuidado para não trancar você mesmo do lado de fora: confira que a porta 22
(SSH) continua liberada antes de qualquer coisa (`sudo ufw allow 22/tcp`).

### 3c. Testar

Do **seu computador** (Windows, terminal normal), ou simplesmente abrindo no
navegador `https://n8n-dmu8.srv1913873.hstgr.cloud`:

- **Abriu a tela de login do n8n** → resolvido, siga para a Etapa 4.
- **Continua "site não pode ser alcançado"** → volte à Etapa 2; provavelmente o
  container ou o proxy não está de pé.
- **Erro de certificado / "não é seguro"** → o proxy subiu mas ainda não emitiu
  o certificado. Espere 2 minutos e recarregue; se persistir, é a variável de
  domínio errada (Etapa 4).

---

## ETAPA 4 — Corrigir o endereço nas variáveis

O n8n grava o próprio endereço nos webhooks que registra. Se ele ainda pensa que
mora no domínio antigo, ele registra a URL errada no Telegram — e falha em
silêncio, sem erro nenhum na tela.

Abra o arquivo de configuração (troque o caminho pelo que você achou na Etapa 2):

```
nano /root/docker-compose.yml
```

Procure o bloco `environment:` do serviço `n8n` e garanta que estas linhas
existem, com o domínio **novo**:

```
      - N8N_HOST=n8n-dmu8.srv1913873.hstgr.cloud
      - WEBHOOK_URL=https://n8n-dmu8.srv1913873.hstgr.cloud/
      - N8N_PROTOCOL=https
      - GENERIC_TIMEZONE=America/Sao_Paulo
      - TZ=America/Sao_Paulo
```

O fuso importa de verdade: sem ele, um gasto lançado às 21h cai no dia seguinte.

No `nano`: setas para navegar, digite normalmente, **Ctrl+O** e Enter para
salvar, **Ctrl+X** para sair. Cuidado com a indentação — YAML não perdoa; alinhe
as linhas novas exatamente como as vizinhas.

Depois de salvar, **suba de novo** (não adianta `restart` — o n8n só lê as
variáveis quando o container nasce):

```
cd /root && docker compose up -d
```

---

## ETAPA 5 — Recriar as credenciais no n8n novo

Abra `https://n8n-dmu8.srv1913873.hstgr.cloud` e crie a conta de dono (se ainda
não criou). Depois, menu **Credentials** → **Add credential**:

**Credencial 1 — Telegram**
- Tipo: **Telegram API**
- Nome: `Telegram Arkad`
- Access Token: o token do BotFather (`123456:ABC-...`)

**Credencial 2 — o app**
- Tipo: **Header Auth**
- Nome: `Bank Agente (Authorization Bearer)`
- **Name**: `Authorization`
- **Value**: `Bearer SEUSEGREDO` — o mesmo valor de `BANK_AGENTE_SECRET` que
  está na Vercel, com a palavra `Bearer ` e um espaço na frente.

> Se você tiver perdido o `BANK_AGENTE_SECRET`: Vercel → projeto `web` →
> Settings → Environment Variables. Se não existir lá, gere um novo
> (`openssl rand -hex 32` no terminal da VPS), cadastre na Vercel, faça
> **Redeploy**, e use o mesmo valor aqui.

---

## ETAPA 6 — Importar os workflows

1. No n8n novo: **Workflows** → botão **Add workflow** → menu `⋮` no canto
   superior direito → **Import from File**.
2. Escolha um dos `.json` que você baixou na Etapa 0.
   (O do consultor também está aqui no repositório, em
   `n8n/telegram-consultor.json`.)
3. **Reatribua as credenciais em cada nó** — os IDs antigos não existem aqui, o
   campo vem vazio ou vermelho. No workflow do consultor:
   - `Telegram (grupo)`, `Confirmar o clique`, `Perguntar a categoria`,
     `Responder no grupo` → credencial **Telegram Arkad**
   - `Chamar o app` → credencial **Bank Agente (Authorization Bearer)**
4. **Salve**. Se a versão nova do n8n mostrar um botão **Publish** separado do
   Save, clique nele também — salvar mexe só no rascunho.
5. Repita para os outros workflows (resumos, Nina, Agenda).

Ainda **não** ative. Antes, a Etapa 7.

---

## ETAPA 7 — Desligar o antigo antes de ligar o novo

O Telegram aceita **um único webhook por bot**. Se os dois n8n estiverem ativos
com o mesmo bot, eles brigam pelo webhook e o comportamento fica aleatório.

1. No n8n **antigo**, abra cada workflow que usa o Telegram e **desative** (a
   chavinha no canto superior direito fica cinza).
2. Só então, no n8n **novo**, **ative** os workflows. É a ativação que registra
   o webhook no Telegram.

---

## ETAPA 8 — Conferir que funcionou

No terminal da VPS, trocando `SEUTOKEN` pelo token do bot:

```
curl -s "https://api.telegram.org/botSEUTOKEN/getWebhookInfo"
```

A resposta tem que mostrar:
- `"url"` contendo **`n8n-dmu8.srv1913873.hstgr.cloud`** (se aparecer o endereço
  antigo, a ativação não pegou — refaça a Etapa 7)
- `"pending_update_count": 0`
- **sem** `"last_error_message"`

Depois, mande no grupo do Telegram: `mercado 230 no nubank`. O bot tem que
responder com a confirmação e o status da semana, e o gasto tem que aparecer em
https://andrademuller.vercel.app/bank/lancamentos

Teste do lado do app, sem passar pelo Telegram (funciona de qualquer terminal):

```
curl -X POST https://andrademuller.vercel.app/api/bank/agente/mensagem -H "Authorization: Bearer SEUSEGREDO" -H "Content-Type: application/json" -d '{"chat_id":-1001234567890,"message_id":999123,"user_id":111111111,"nome":"Arlison","texto":"mercado 230 no nubank"}'
```

Troque o `message_id` a cada teste — cada um só é processado uma vez.

---

## Se travar, me mande o resultado destes três

```
docker ps
```
```
sudo ufw status
```
```
curl -s "https://api.telegram.org/botSEUTOKEN/getWebhookInfo"
```

(no último, apague o token da saída antes de colar aqui)
