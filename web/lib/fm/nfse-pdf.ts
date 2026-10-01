import { extractText, getDocumentProxy } from "unpdf";

// Leitura do DANFSe (PDF da NFS-e nacional, layout v2.0) emitido pela FM.
// Só LÊ o texto do PDF pra preencher a nota — o arquivo em si nunca é
// alterado: o que vai pro e-mail é o original, byte a byte.
//
// Conferido em 01/out/2026 contra as notas nº 35–38 (layout nacional); as
// notas antigas (nº 4–34, layout municipal) não passam por aqui.

export const CNPJ_FM = "60563257000183";

export type NotaLida = {
  numero: string; // "37"
  chave: string; // 50 dígitos
  prestador: string; // CNPJ só dígitos
  tomadorDocumento: string; // CNPJ/CPF só dígitos
  tomadorNome: string;
  valor: number;
  competencia: string; // AAAA-MM-01
  emissao: string | null; // AAAA-MM-DD
};

const digitos = (s: string) => s.replace(/\D/g, "");

/** Lê o texto do PDF (todas as páginas, com quebras de linha). */
export async function textoDoPdf(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** Extrai os campos do texto. Lança erro com o campo que faltou. */
export function lerDanfse(texto: string): NotaLida {
  const campo = (re: RegExp, nome: string) => {
    const m = texto.match(re);
    if (!m) throw new Error(`Não achei "${nome}" no PDF — é um DANFSe da FM?`);
    return m[1].trim();
  };

  const numero = campo(/N[ÚU]MERO DA NFS-e\s*\n\s*(\d+)/i, "número da NFS-e");
  const chave = digitos(campo(/CHAVE DE ACESSO DA NFS-e\s*\n\s*([\d\s]{44,60})/i, "chave de acesso"));
  const prestador = digitos(campo(/PRESTADOR \/ FORNECEDOR CNPJ \/ CPF \/ NIF\s*\n\s*([\d./-]+)/i, "CNPJ do prestador"));
  const tomadorDocumento = digitos(campo(/TOMADOR \/ ADQUIRENTE CNPJ \/ CPF \/ NIF\s*\n\s*([\d./-]+)/i, "CNPJ/CPF do tomador"));
  const tomadorNome = campo(
    /TOMADOR \/ ADQUIRENTE[\s\S]*?Nome \/ Nome Empresarial\s*\n(.+)/i,
    "nome do tomador",
  );
  const valorTexto = campo(/VALOR TOTAL DA NFS-e[^\n]*\n\s*R\$\s*([\d.]+,\d{2})/i, "valor total");
  const valor = Number(valorTexto.replace(/\./g, "").replace(",", "."));

  // Competência: a descrição do serviço diz "Competência: 09/26"; se não
  // tiver, usa o mês do campo COMPETÊNCIA DA NFS-e (que vem como data).
  let competencia: string;
  const naDescricao = texto.match(/Compet[êe]ncia:\s*(\d{2})\/(\d{2,4})/i);
  if (naDescricao) {
    const ano = naDescricao[2].length === 2 ? `20${naDescricao[2]}` : naDescricao[2];
    competencia = `${ano}-${naDescricao[1]}-01`;
  } else {
    const d = campo(/COMPET[ÊE]NCIA DA NFS-e\s*\n\s*(\d{2}\/\d{2}\/\d{4})/i, "competência");
    competencia = `${d.slice(6, 10)}-${d.slice(3, 5)}-01`;
  }

  const em = texto.match(/DATA E HORA DA EMISS[ÃA]O DA NFS-e\s*\n\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const emissao = em ? `${em[3]}-${em[2]}-${em[1]}` : null;

  if (chave.length !== 50) throw new Error(`Chave de acesso com ${chave.length} dígitos (esperado 50).`);
  if (!(valor > 0)) throw new Error("Valor da nota não encontrado.");

  return { numero, chave, prestador, tomadorDocumento, tomadorNome, valor, competencia, emissao };
}

/** SHA-256 em hex — a "impressão digital" do arquivo, conferida antes de enviar. */
export async function sha256(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
