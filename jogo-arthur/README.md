# Jogo do Arthur

Jogo pedagógico do Arthur (4 anos). Projeto à parte do Portal: não usa Supabase nem mexe no FM/Bank.

- **Onde joga**: **andrademuller.vercel.app/jogo** (atrás do login da família; card "Jogo do Arthur" no hub). As prévias de cada mudança saem antes por um link privado do Claude.
- **Publicar no Portal**: editar `jogo-arthur/index.html` (fonte) e rodar `python jogo-arthur/publicar_no_portal.py`, que gera `web/public/jogo/index.html`. Não editar o gerado.
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

## Parceiro e nomes do elenco
- **Parceiro = Pikachu** (pedido do Arlison, 16/out/2026): segue o treinador no mapa, luta junto na batalha (choque do trovão). É personagem da Nintendo — ok porque o jogo é privado da família. **Se um dia for distribuído ou vendido, trocar** a constante `PARCEIRO` (e `SPRITES.pikachu`) por um parceiro próprio; é o único ponto do código.
- **Nomes em 3 idiomas** (`NOMES`): montados com palavras reais pra ensinar junto — Brasito/Firo/Fueguito (fire/fuego), Folhapulo/Leafhop/Hojasalto, etc., mais o bicho nos 3 idiomas. Aparecem e são falados na captura e no álbum; na batalha o nome segue a bandeira escolhida.

## Prêmios reais
Área dos pais (⚙️, abre com uma multiplicação 6–9 × 6–9): cadastro de prêmios (`S.premios`: emoji, nome, preço) e lista de pedidos (`S.pedidos`: pedido → entregue | devolvido). A criança troca só com o **cofrinho** (não com a carteira) no Banco; as moedas saem na hora e aparece um vale. "Devolver moedas" estorna para o cofrinho. Tudo no `localStorage` do aparelho — pedido feito no notebook só aparece no notebook.

## Voz
`falar()` usa uma **fila e nunca corta uma fala no meio** (17/out/2026 — no notebook do Arlison as falas ainda se atropelavam): `falar(t)` descarta só o que estava *esperando* e entra; a frase que está tocando termina antes. `falar(t,i,true)` entra no fim (continuação do fluxo). O texto é quebrado em frases curtas (`frasesDe`), então a espera é pequena. `calar()` só esvazia a fila (troca de tela); `calarJa()` corta na hora (só ao desligar o som). A voz é escolhida por nota (`notaVoz`): "Natural/Neural/Online" (Edge) > "Google" (Chrome) > vozes antigas do Windows; rate 0,95 e pitch 1. Os pais podem fixar e testar a voz de cada idioma na Área dos pais (`S.vozes`). No Windows, o **Edge** tem as vozes mais naturais.

## Pokébolas, Equipe, evolução e Arena (17/out/2026)
- **Captura com bola**: vencer o monstrinho dá 2 moedas; capturar exige jogar uma bola (`BOLAS`: Pokébola 3 moedas/60%, Grande Bola 6/80%, Ultra Bola 10/95%, vendidas no Banco, pagas com a carteira). Duas bolas escapadas = ele foge. Começa com 5 Pokébolas. "Pokébola" é marca da Nintendo — mesma ressalva do Pikachu.
- **Coleção** (`S.colecao[key] = {qtd, evoluido}`): cada igual capturado = +1 nível; com `EVOLUI_COM` (10) evolui para sempre (`EVO`: nome novo nos 3 idiomas, sprite com outra cor + coroa via `sprCvEvo`; evoluído ganha +5 de nível). Tela **Minha Equipe** (prédio EQUIPE no mapa). Pikachu sobe 1 nível a cada 3 capturas (máx. 20) e nunca é perdido.
- **Arena** (`RIVAIS`: Lucas, Bia, Davi, Mestra Lia, Campeão Téo + Equipe Rocket, que aparece depois da Bia): cada um libera o próximo. Duelo: acerto = ataque dele (dano `1 + nível/4`, corações `3 + nível/3`), erro = ataque do rival. Vitória = moedas + insígnia (`S.insignias`). Derrota = −2 moedas e 1 cópia do monstrinho que lutou; a Equipe Rocket rouba 1 cópia aleatória.
- **Desafio novo `somar`**: dois grupos de moedas, "quantas moedas você tem agora?" — nos duelos.

## Celular
Melhor **deitado** (decisão do Arlison, 17/out/2026). Deitado (`orientation:landscape` + `max-height:520px` + `pointer:coarse`), na plataforma e no mapa o cabeçalho some (`body[data-tela]`), o jogo ocupa a tela e os botões ficam pequenos nos cantos, por cima; o 🏠 do HUD (`.sair-jogo`) sai do jogo. Em pé, os botões da plataforma vão para uma barra própria embaixo do canvas e, uma vez por sessão, aparece "Vire o celular de lado".
