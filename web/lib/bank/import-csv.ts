// Parser de fatura de cartão em CSV — tolerante a formato: detecta
// separador (, ou ;), acha as colunas por nome (data/descrição/valor) e
// aceita número pt-BR (1.234,56) ou en (1234.56) e data dd/mm/aaaa ou ISO.
// Cobre o CSV do Nubank (date,title,amount) e exports genéricos
// (Carrefour/planilhas). Linhas de pagamento/estorno (valor <= 0 no padrão
// Nubank) são ignoradas — fatura só tem gasto.

export type LinhaFatura = {
  data: string; // ISO yyyy-mm-dd
  descricao: string;
  valor: number; // sempre positivo
  parcela_atual: number | null;
  parcela_total: number | null;
};

export type ResultadoParse = {
  linhas: LinhaFatura[];
  ignoradas: number; // pagamentos/estornos/linhas ilegíveis
};

function detectarSeparador(cabecalho: string) {
  return (cabecalho.match(/;/g)?.length ?? 0) > (cabecalho.match(/,/g)?.length ?? 0)
    ? ";"
    : ",";
}

// Split respeitando aspas.
function dividir(linha: string, sep: string) {
  const campos: string[] = [];
  let atual = "";
  let emAspas = false;
  for (const ch of linha) {
    if (ch === '"') emAspas = !emAspas;
    else if (ch === sep && !emAspas) {
      campos.push(atual.trim());
      atual = "";
    } else atual += ch;
  }
  campos.push(atual.trim());
  return campos;
}

function parseNumero(bruto: string): number | null {
  const limpo = bruto.replace(/[R$\s]/g, "");
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(",") && limpo.includes(".")) {
    // 1.234,56 → pt-BR (ponto de milhar) | 1,234.56 → en
    normalizado =
      limpo.lastIndexOf(",") > limpo.lastIndexOf(".")
        ? limpo.replace(/\./g, "").replace(",", ".")
        : limpo.replace(/,/g, "");
  } else if (limpo.includes(",")) {
    normalizado = limpo.replace(",", ".");
  }
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

function parseData(bruto: string): string | null {
  const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = bruto.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function parseParcela(descricao: string): { atual: number; total: number } | null {
  // "LOJA X 3/10", "PARC 03/12", "Compra - Parcela 2/5"
  const m = descricao.match(/(?:^|\s|-)(\d{1,2})\s*\/\s*(\d{1,2})(?:\s|$)/);
  if (!m) return null;
  const atual = Number(m[1]);
  const total = Number(m[2]);
  if (atual >= 1 && total >= atual && total <= 48) return { atual, total };
  return null;
}

const NOMES_DATA = ["data", "date", "dia"];
const NOMES_DESCRICAO = ["descricao", "descrição", "title", "titulo", "título", "lancamento", "lançamento", "estabelecimento", "historico", "histórico"];
const NOMES_VALOR = ["valor", "amount", "value", "quantia"];

export function parseFaturaCSV(conteudo: string): ResultadoParse {
  // Remove BOM e normaliza quebras.
  const texto = conteudo.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const linhasBrutas = texto.split("\n").filter((l) => l.trim().length > 0);
  if (linhasBrutas.length === 0) return { linhas: [], ignoradas: 0 };

  const sep = detectarSeparador(linhasBrutas[0]);
  const cabecalho = dividir(linhasBrutas[0], sep).map((c) => c.toLowerCase());

  const idx = (nomes: string[]) => cabecalho.findIndex((c) => nomes.some((n) => c.includes(n)));
  let iData = idx(NOMES_DATA);
  let iDesc = idx(NOMES_DESCRICAO);
  let iValor = idx(NOMES_VALOR);
  let comecoDados = 1;

  // Sem cabeçalho reconhecível: assume data,descrição,valor posicionais.
  if (iData < 0 || iDesc < 0 || iValor < 0) {
    iData = 0;
    iDesc = 1;
    iValor = 2;
    comecoDados = parseData(dividir(linhasBrutas[0], sep)[0] ?? "") ? 0 : 1;
  }

  const linhas: LinhaFatura[] = [];
  let ignoradas = 0;

  for (const bruta of linhasBrutas.slice(comecoDados)) {
    const campos = dividir(bruta, sep);
    const data = parseData(campos[iData] ?? "");
    const descricao = (campos[iDesc] ?? "").replace(/^"|"$/g, "").trim();
    const valor = parseNumero(campos[iValor] ?? "");
    if (!data || !descricao || valor == null) {
      ignoradas++;
      continue;
    }
    // Pagamento da fatura anterior / estorno vem negativo no Nubank.
    if (valor <= 0 || /pagamento recebido|pagamento de fatura/i.test(descricao)) {
      ignoradas++;
      continue;
    }
    const parcela = parseParcela(descricao);
    linhas.push({
      data,
      descricao,
      valor,
      parcela_atual: parcela?.atual ?? null,
      parcela_total: parcela?.total ?? null,
    });
  }

  return { linhas, ignoradas };
}

// Aplica regras de categorização: match parcial case-insensitive na
// descrição, menor prioridade numérica primeiro (padrão do schema:
// "regras mais específicas com prioridade maior" — aqui prioridade menor
// = testada antes, como o seed usa 10/20/30).
export function aplicarRegras(
  descricao: string,
  regras: Array<{ padrao_texto: string; categoria_id: string | null; prioridade: number | null }>,
): string | null {
  const alvo = descricao.toUpperCase();
  const ordenadas = [...regras].sort(
    (a, b) => (a.prioridade ?? 0) - (b.prioridade ?? 0),
  );
  for (const r of ordenadas) {
    if (r.categoria_id && alvo.includes(r.padrao_texto.toUpperCase())) {
      return r.categoria_id;
    }
  }
  return null;
}
