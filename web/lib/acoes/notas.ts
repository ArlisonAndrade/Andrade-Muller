"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CNPJ_FM, lerDanfse, sha256, textoDoPdf, type NotaLida } from "@/lib/fm/nfse-pdf";
import { enviarEmailNf, envioConfigurado } from "@/lib/fm/email-nf";

// Subir NFS-e no Portal (01/out/2026): o navegador sobe o PDF original pro
// bucket privado `fiscal` (notas/entrada/…), estas ações leem, conferem e
// arquivam em notas/AAAA/MM/<nome original>, lançam a nota em fm_faturamento
// e, se pedido, mandam o e-mail com os PDFs ORIGINAIS.
//
// Regra de ouro: o servidor nunca confia no que veio da tela. Pra salvar e
// enviar, baixa de novo cada PDF do bucket, relê e recalcula o SHA-256 — e só
// segue se bater com o que a pessoa viu na prévia.

const BUCKET = "fiscal";

export type NotaPreparada = {
  arquivo: string;
  caminho: string;
  sha256: string;
  nota: NotaLida | null;
  cliente: { id: string; nome: string; emailNf: string | null; contatoNf: string | null } | null;
  existente: { id: string; numero: string | null; status: string; enviadaEm: string | null } | null;
  erro: string | null;
};

type Supa = Awaited<ReturnType<typeof createClient>>;

async function baixar(supabase: Supa, caminho: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(caminho);
  if (error || !data) throw new Error(`Não consegui ler o arquivo guardado (${caminho}).`);
  return new Uint8Array(await data.arrayBuffer());
}

async function conferir(supabase: Supa, caminho: string, bytes: Uint8Array) {
  const nota = lerDanfse(await textoDoPdf(bytes));
  if (nota.prestador !== CNPJ_FM) throw new Error("Essa nota não foi emitida pela FM (CNPJ do prestador diferente).");

  const { data: clientes, error } = await supabase
    .from("fm_clientes")
    .select("id, empresa, nome_contato, email_nf, contato_nf")
    .eq("documento", nota.tomadorDocumento);
  if (error) throw new Error(`Erro ao buscar o cliente: ${error.message}`);
  const c = clientes?.[0];
  const cliente = c
    ? { id: c.id as string, nome: (c.empresa || c.nome_contato) as string, emailNf: c.email_nf as string | null, contatoNf: c.contato_nf as string | null }
    : null;

  // A nota já existe? Pela chave nacional; senão, a que nasceu da sugestão do
  // contrato (mesmo mês, cliente e valor, ainda sem chave).
  let existente: NotaPreparada["existente"] = null;
  const { data: porChave } = await supabase
    .from("fm_faturamento")
    .select("id, numero_nfse, status, enviada_em")
    .eq("chave_nfse", nota.chave)
    .maybeSingle();
  const achada =
    porChave ??
    (cliente
      ? (
          await supabase
            .from("fm_faturamento")
            .select("id, numero_nfse, status, enviada_em")
            .eq("competencia", nota.competencia)
            .eq("cliente_id", cliente.id)
            .eq("valor", nota.valor)
            .is("chave_nfse", null)
            .limit(1)
            .maybeSingle()
        ).data
      : null);
  if (achada) existente = { id: achada.id, numero: achada.numero_nfse, status: achada.status, enviadaEm: achada.enviada_em };

  return { nota, cliente, existente, caminho, sha: await sha256(bytes) };
}

/** Lê os PDFs que o navegador subiu em notas/entrada/ e arquiva no mês certo. */
export async function prepararNotas(entradas: Array<{ caminho: string; nome: string }>): Promise<NotaPreparada[]> {
  const supabase = await createClient();
  const saida: NotaPreparada[] = [];

  for (const e of entradas) {
    const base: NotaPreparada = { arquivo: e.nome, caminho: e.caminho, sha256: "", nota: null, cliente: null, existente: null, erro: null };
    try {
      const bytes = await baixar(supabase, e.caminho);
      const r = await conferir(supabase, e.caminho, bytes);
      base.sha256 = r.sha;
      base.nota = r.nota;
      base.cliente = r.cliente;
      base.existente = r.existente;
      if (!r.cliente) base.erro = `Cliente com CNPJ/CPF ${r.nota.tomadorDocumento} (${r.nota.tomadorNome}) não está cadastrado.`;

      // Arquiva em notas/AAAA/MM/<nome original>. Se já houver um arquivo
      // com esse nome, só aceita se for o MESMO (mesmo SHA-256).
      const destino = `notas/${r.nota.competencia.slice(0, 4)}/${r.nota.competencia.slice(5, 7)}/${e.nome}`;
      const { error: erroMove } = await supabase.storage.from(BUCKET).move(e.caminho, destino);
      if (erroMove) {
        const jaGuardado = await baixar(supabase, destino).catch(() => null);
        if (jaGuardado && (await sha256(jaGuardado)) === r.sha) {
          await supabase.storage.from(BUCKET).remove([e.caminho]);
        } else {
          throw new Error(`Não consegui arquivar o PDF: ${erroMove.message}`);
        }
      }
      base.caminho = destino;
    } catch (err) {
      base.erro = err instanceof Error ? err.message : String(err);
    }
    saida.push(base);
  }
  return saida;
}

export type ResultadoNotas = { ok: boolean; mensagens: string[] };

/**
 * Salva as notas e, conforme o modo, envia o e-mail.
 * - "salvar": só lança/atualiza as notas.
 * - "teste": lança e manda o e-mail só pra quem está logado (não marca como enviada).
 * - "enviar": lança e manda pro destinatário de cada cliente (email_nf).
 */
export async function salvarNotas(
  itens: Array<{ caminho: string; sha256: string }>,
  modo: "salvar" | "teste" | "enviar",
): Promise<ResultadoNotas> {
  const supabase = await createClient();
  const mensagens: string[] = [];

  if (modo !== "salvar" && !envioConfigurado()) {
    return { ok: false, mensagens: ["O envio de e-mail ainda não está configurado no servidor (GMAIL_USUARIO / GMAIL_SENHA_APP). Nada foi salvo."] };
  }

  // 1. Relê e confere tudo antes de gravar qualquer coisa.
  const conferidas: Array<Awaited<ReturnType<typeof conferir>> & { bytes: Uint8Array; nome: string }> = [];
  for (const item of itens) {
    try {
      const bytes = await baixar(supabase, item.caminho);
      const r = await conferir(supabase, item.caminho, bytes);
      if (r.sha !== item.sha256) throw new Error("o arquivo guardado não é o mesmo da prévia");
      if (!r.cliente) throw new Error(`cliente ${r.nota.tomadorNome} não cadastrado`);
      conferidas.push({ ...r, bytes, nome: item.caminho.split("/").pop()! });
    } catch (err) {
      return { ok: false, mensagens: [`${item.caminho.split("/").pop()}: ${err instanceof Error ? err.message : err}. Nada foi salvo nem enviado.`] };
    }
  }

  // 2. Lança/atualiza as notas.
  const ids = new Map<string, string>(); // caminho → id
  for (const c of conferidas) {
    const dados = {
      cliente_id: c.cliente!.id,
      numero_nfse: `Nr ${c.nota.numero}`,
      valor: c.nota.valor,
      competencia: c.nota.competencia,
      status: "concluido",
      data_emissao: c.nota.emissao,
      arquivo_origem: c.caminho,
      chave_nfse: c.nota.chave,
      arquivo_sha256: c.sha,
    };
    if (c.existente) {
      const { error } = await supabase.from("fm_faturamento").update(dados).eq("id", c.existente.id);
      if (error) return { ok: false, mensagens: [...mensagens, `Erro ao atualizar a nota ${c.nota.numero}: ${error.message}`] };
      ids.set(c.caminho, c.existente.id);
      mensagens.push(`Nota ${c.nota.numero} (${c.cliente!.nome}) atualizada.`);
    } else {
      // Nota nova: liga ao contrato ativo do cliente, se houver (antes isso
      // vinha da "sugestão do mês", que saiu junto com o lançamento manual).
      const { data: contrato } = await supabase
        .from("fm_contratos")
        .select("id")
        .eq("cliente_id", c.cliente!.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      const { data, error } = await supabase
        .from("fm_faturamento")
        .insert({ ...dados, contrato_id: contrato?.id ?? null })
        .select("id")
        .single();
      if (error) return { ok: false, mensagens: [...mensagens, `Erro ao lançar a nota ${c.nota.numero}: ${error.message}`] };
      ids.set(c.caminho, data.id);
      mensagens.push(`Nota ${c.nota.numero} (${c.cliente!.nome}) lançada.`);
    }
  }
  revalidatePath("/financeiro");

  if (modo === "salvar") return { ok: true, mensagens };

  // 3. Um e-mail por destinatário (IBVET e IEA vão juntas pra Marta).
  let destinoTeste: string | null = null;
  if (modo === "teste") {
    const { data } = await supabase.auth.getUser();
    destinoTeste = data.user?.email ?? null;
    if (!destinoTeste) return { ok: false, mensagens: [...mensagens, "Não achei o seu e-mail de login pra mandar o teste."] };
  }

  const grupos = new Map<string, typeof conferidas>();
  for (const c of conferidas) {
    const para = destinoTeste ?? c.cliente!.emailNf;
    if (!para) {
      mensagens.push(`Nota ${c.nota.numero}: ${c.cliente!.nome} não tem e-mail de nota cadastrado — não enviada.`);
      continue;
    }
    grupos.set(para, [...(grupos.get(para) ?? []), c]);
  }

  let ok = true;
  for (const [para, notas] of grupos) {
    try {
      await enviarEmailNf({
        para,
        contato: notas[0].cliente!.contatoNf,
        competencia: notas[0].nota.competencia,
        anexos: notas.map((n) => ({ nome: n.nome, bytes: n.bytes })),
      });
      const lista = notas.map((n) => `nº ${n.nota.numero}`).join(" e ");
      if (modo === "enviar") {
        await supabase
          .from("fm_faturamento")
          .update({ enviada_em: new Date().toISOString(), enviada_para: para })
          .in("id", notas.map((n) => ids.get(n.caminho)!));
        mensagens.push(`E-mail enviado pra ${para} com ${lista}.`);
      } else {
        mensagens.push(`Teste enviado pra ${para} com ${lista}.`);
      }
    } catch (err) {
      ok = false;
      mensagens.push(`Falhou o envio pra ${para}: ${err instanceof Error ? err.message : err}`);
    }
  }
  revalidatePath("/financeiro");
  return { ok, mensagens };
}
