# Design tokens — Andrade Muller Bank

Extraído da direção visual aprovada (estilo Avenue: minimalista, serifa no destaque, muito espaço em branco).

## Tipografia
- **Números/valores em destaque (hero)**: serifa, peso 500 — ex: Georgia, ou equivalente via Google Fonts (`Source Serif 4`, `Lora`)
- **UI geral (nav, labels, botões)**: sans-serif — `Inter` ou `Helvetica Neue`
- **Categoria/legenda pequena** (ex: "BANK" abaixo do wordmark): sans-serif, letter-spacing 2-3px, caixa alta, cor secundária

| Uso | Tamanho | Peso |
|---|---|---|
| Hero number (patrimônio) | 44px | 500 |
| Card number (fatura, resumo) | 24-32px | 500 |
| Body / labels | 14-16px | 400 |
| Caption / metadata | 12-13px | 400 |

## Cores
Paleta neutra, sem gradiente, acentos discretos:

| Token | Uso |
|---|---|
| `--text-primary` (quase preto) | Números e títulos |
| `--text-secondary` (cinza médio) | Labels, legendas |
| `--text-accent` (verde ou azul discreto) | Links, valores positivos |
| `--surface-2` (branco) | Fundo da página |
| `--surface-1` (cinza muito claro) | Cards de destaque (ex: "próxima fatura") |
| `--border` (cinza claro, 0.5px) | Divisórias e cards de ação |

## Componentes
- **Cards de ação rápida**: borda fina (0.5px), sem sombra, radius 12px, ícone outline 20px + label 14px/500
- **Card metric destacado**: fundo `--surface-1`, sem borda, radius 12px, número grande em cima, label pequeno embaixo
- **Nav superior**: wordmark à esquerda, itens de menu centralizados/à direita em 14px, avatar circular com iniciais à direita
- **Ícones**: Tabler outline apenas, nunca filled, 16-24px

## Identidade por módulo
- **Bank**: logo aprovada (dois círculos entrelaçados + wordmark serifado) — arquivo `logo_andrade_muller_bank.svg`
- **FM Gestão**: identidade visual própria, a definir separadamente
- **Carteira do Arthur**: não é módulo independente — vive como seção dentro do Bank, pode ter um acento de cor próprio (ex: um tom diferente na paleta) para se diferenciar visualmente sem sair do app
