// Conteúdo escrito à mão para a reunião trimestral, por trimestre ('AAAA-T#').
// O que sai do banco (gráfico da carteira, aportes, dívida, semanas) é
// calculado em lib/bank/trimestre.ts e aparece em toda reunião; aqui fica o
// que o sistema não sabe sozinho — fatos de fora (Fator R, margem da
// consultoria, régua do Brasil com fonte), contexto de decisões e o que já
// está contratado pro futuro. Slide cujo bloco não existe no trimestre não
// aparece. Pra repetir um slide na reunião seguinte, copiar o bloco para a
// chave nova e atualizar os números.

export type CardConstruimos = { emoji: string; titulo: string; valor: string; texto: string };

export type LinhaRegua = { indicador: string; brasil: string; nos: string; ressalva?: boolean };

export type BlocoFuturo = {
  quando: string;
  valor: string;
  detalhe: string;
  apoio?: string;
  destaque?: string; // frase maior que o resto do slide
};

export type ConteudoReuniao = {
  construimos?: { cards: CardConstruimos[] };
  regua?: {
    linhas: LinhaRegua[];
    ressalva: string;
    contexto: string[];
    fecho: string;
    fontes: string;
  };
  escolhas?: { pesou: string[]; fizemos: string[]; fecho: string };
  arQueVem?: {
    blocos: [BlocoFuturo, BlocoFuturo];
    renda: { titulo: string; linhas: Array<{ ano: string; valor: string; variacao: string }>; nota: string };
    fecho: string;
  };
};

export const CONTEUDO_REUNIAO: Record<string, ConteudoReuniao> = {
  "2026-T3": {
    construimos: {
      cards: [
        {
          emoji: "🧾",
          titulo: "Fator R virado",
          valor: "16,01% → 30–32%",
          texto: "Em jan/26 era Anexo V, 15,5% de imposto. Agora é Anexo III, 6%. São uns R$ 9.000 por ano que ficam com a gente.",
        },
        {
          emoji: "📊",
          titulo: "Margem da consultoria",
          valor: "81,76%",
          texto: "No 2º tri de 2026, a melhor desde o 4º tri de 2025.",
        },
        {
          emoji: "🏦",
          titulo: "Dívida atravessada",
          valor: "R$ 54.405,84",
          texto:
            "Pagos ao Santander desde jan/2025, descontados em folha (R$ 31.570,56 em 2025 + R$ 15.785,28 de jan a jun/26 + R$ 7.050 de jul a set/26). No mesmo período a carteira quase triplicou.",
        },
      ],
    },
    regua: {
      linhas: [
        { indicador: "Tem alguma reserva", brasil: "69%", nos: "Sim" },
        { indicador: "Reserva acima de 6 meses", brasil: "24%", nos: "Sim", ressalva: true },
        { indicador: "Investe em produtos financeiros", brasil: "36%", nos: "Sim" },
        { indicador: "Tem ações, Tesouro ou FII", brasil: "2%", nos: "Os 3" },
        { indicador: "Renda comprometida com dívida", brasil: "29,5%", nos: "12,8%" },
      ],
      ressalva: "Com ressalva: parte da reserva foi emprestada ao próprio aporte e está sendo reposta.",
      contexto: [
        "82% das famílias brasileiras estão endividadas, recorde da série histórica.",
        "42% dos inadimplentes de 2026 já estavam negativados há dez anos. A reincidência é a regra.",
      ],
      fecho: "Quatro em cada dez famílias que estavam no buraco há dez anos continuam lá. A gente saiu.",
      fontes:
        "Fontes: Peic/CNC (ago/2026); Raio X do Investidor Brasileiro, 9ª ed. (Anbima/Datafolha); Mapa da Inadimplência Serasa, 10 anos.",
    },
    escolhas: {
      pesou: [
        "Estouros nos gastos de liberdade (os 30% do 50/30/20): R$ 8.570 em mai/26 e R$ 6.907 em jul/26.",
        "Foi preciso recorrer à reserva para a entrada da negociação com o BB.",
      ],
      fizemos: [
        "Nenhum resgate de posição. O aplicado ficou entre R$ 55 e 57 mil o semestre inteiro — nada foi desmontado.",
        "A carteira foi de R$ 52.434 (mar/26) para R$ 60.408 (set/26): +15,2%.",
        "O aporte nunca parou: R$ 750 em jul e ago, R$ 930 em set, inteiros para repor a reserva, com juros e correção. O saque virou uma dívida com a gente mesmo, que se paga como qualquer outra.",
      ],
      fecho:
        "A gente não parou de aportar. A gente mudou o credor. Primeiro paga a dívida que a gente tem com a própria reserva — com juros e correção, igual banco — e só depois o dinheiro volta a ser nosso.",
    },
    arQueVem: {
      blocos: [
        {
          quando: "Daqui a 2 meses",
          valor: "R$ 11.000",
          detalhe: "Dezembro/2026: segunda parcela do 13º + adicional de férias.",
          apoio: "É mais que o aporte dos últimos 12 meses somados.",
        },
        {
          quando: "Junho de 2027",
          valor: "+R$ 2.393 por mês",
          detalhe: "Promoção a Major. Soldo de R$ 9.976 para R$ 12.108.",
          apoio: "Líquidos, todo mês, para sempre.",
          destaque:
            "O aumento da promoção é MAIOR que a parcela do Santander. R$ 2.393 contra R$ 2.354. A partir de junho de 2027 a dívida para de sair do nosso bolso — ela passa a ser paga pela promoção.",
        },
      ],
      renda: {
        titulo: "Onde isso nos coloca",
        linhas: [
          { ano: "2026", valor: "R$ 137.129", variacao: "—" },
          { ano: "2027", valor: "R$ 154.922", variacao: "+13,0%" },
          { ano: "2028", valor: "R$ 168.795", variacao: "+23,1%" },
        ],
        nota: "Renda líquida anual do Arlison. A projeção mantém a renda da Franciele constante em R$ 9.000/mês; o crescimento da consultoria entra por cima disso.",
      },
      fecho:
        "A gente não precisa acertar tudo nos próximos meses. Precisa não desmontar o que já está de pé. O resto já está contratado e vem sozinho.",
    },
  },
};
