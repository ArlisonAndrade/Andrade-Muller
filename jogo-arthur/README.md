# Jogo do Arthur

Jogo pedagógico do Arthur (4 anos). Projeto à parte do Portal — só mora neste repositório por simplicidade; não é rota do `web/` nem usa Supabase.

- **Onde joga**: publicado como página do Claude (privada), abre no Claude desktop e no app do celular.
- **Arquivo único**: `index.html` (HTML + CSS + JS, sem build, sem dependência). Para testar local, abrir o arquivo no navegador.
- **Progresso**: fica no `localStorage` de cada aparelho (chave `jogo-arthur-v1`) — celular e notebook não compartilham.
- **Voz**: `speechSynthesis` do navegador (pt-BR, en-US, es-ES). Não usa microfone.

## Modos
| Modo | O que ensina |
|---|---|
| Explorar o mapa | mapa visto de cima em pixel art 16-bit: o treinador anda com as setas, encontra monstrinhos na grama alta (viram batalha) e entra nos prédios — Casa (rotina), Escola (leitura/digitação/letras), Banco (cofrinho), Prefeitura (construir), Fliper (plataforma), Arena (chefões) |
| Minha Cidade | construir com moedas, prédios que rendem (loja +1/dia, banco +2/dia), missões de finanças e idiomas |
| Pular e pegar | plataforma estilo Mario; blocos "?" soltam as letras do nome em ordem; moedas vão pra carteira |
| Aventura | mapa de 8 fases, monstrinhos capturados com teia acertando letra/leitura/contagem; chefão = escrever o nome |
| Rotina do dia | escovar dente, comer tudo, arrumar cama… 1 moeda cada, 1×/dia |
| Cofrinho + Meu sonho | guardar rende +1 a cada 5 por dia; lendário caro só se compra com o cofrinho (esperar e guardar) |
| Letras, Palavras, Contar, Preciso ou quero, Meu nome, Digitar, Ler | treinos avulsos |

Personagens são originais (inspirados em monstrinhos de bolso e herói de teia) — não usar marcas registradas.

## Controle de videogame
Gamepad API do navegador (Bluetooth ou USB, mapeamento "standard" Xbox/PlayStation). Mapa: direcional/analógico anda, A fala/entra, B fecha. Pular e pegar: A pula. O navegador só enxerga o controle depois de apertar um botão com a página aberta. Se dentro do Claude não reconhecer, abrir este `index.html` direto no Chrome/Edge.
