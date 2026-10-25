import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { montarBalanco, type DadosBalanco } from "@/lib/bank/balanco/dados";
import { DocumentoBalanco } from "@/lib/bank/balanco/documento";
import { lerDecisoes, linhasDeCobranca, tecladoDaPergunta } from "@/lib/bank/balanco/decisoes";

// Gera o PDF e entrega ao n8n, que manda no grupo pelo bot do Arkad. O token
// do Telegram fica só no n8n (credencial "Arkad"); o app autentica no webhook
// com o mesmo segredo que o n8n usa para chamar o app (BANK_AGENTE_SECRET,
// credencial "Vercel" de lá).

const WEBHOOK_PADRAO = "https://n8n-dmu8.srv1913873.hstgr.cloud/webhook/andrade-muller-balanco";

export const nomeDoArquivo = (d: Pick<DadosBalanco, "sigla">) => `Balanco_Patrimonial_${d.sigla}_Andrade_Muller.pdf`;

export async function gerarPdfBalanco(supabase: SupabaseClient, trimestre: string) {
  const dados = await montarBalanco(supabase, trimestre);
  // renderToBuffer espera o elemento <Document>; DocumentoBalanco devolve um.
  const pdf = await renderToBuffer(createElement(DocumentoBalanco, { d: dados }) as Parameters<typeof renderToBuffer>[0]);
  return { pdf, dados, nome: nomeDoArquivo(dados) };
}

export function legendaDoBalanco(d: DadosBalanco) {
  const titulo = `<b>Família, aqui está o Balanço Patrimonial do ${d.sigla}.</b>`;
  if (d.reuniao.realizada) {
    return `${titulo}\nOs compromissos que vocês firmaram estão na página 5. No ${d.proximaSigla} eu confiro cada um.`;
  }
  if (d.decisoes) {
    const todas = d.decisoes.perguntas.every((q) => q.respostas.every((r) => r != null));
    return todas
      ? `${titulo}\nAs decisões de cada um estão na página 5. No ${d.proximaSigla} eu confiro se viraram prática.`
      : `${titulo}\nAs decisões de cada um estão na página 5, e o que ficou sem resposta também ficou registrado.`;
  }
  return `${titulo}\nOs números estão completos. As decisões não: o trimestre fechou sem reunião familiar, e isso também ficou registrado no balanço.`;
}

/**
 * A mensagem do dia 25 quando o trimestre fechou sem reunião (texto aprovado
 * pelo Arlison em 25/out/2026): o custo de não ter sentado à mesa, com os fatos
 * do próprio trimestre. Vai antes do PDF. Com reunião feita, não há mensagem.
 */
export function mensagemSemReuniao(d: DadosBalanco): string | null {
  if (d.reuniao.realizada) return null;
  const fatos: string[] = [];
  if (d.numeros.retiradas > 0) fatos.push("o aporte saiu da reserva e ninguém decidiu se isso se repete no próximo trimestre");
  if (d.semanas.total > 0 && d.semanas.dentro / d.semanas.total < 0.5) {
    fatos.push(`a semana passou da meta em ${d.semanas.total - d.semanas.dentro} de ${d.semanas.total} semanas e ninguém escolheu o que muda`);
  }
  const custo = fatos.length
    ? ` O que faltou foi a conversa, e isso tem custo: ${fatos.join(". E ")}.`
    : " O que faltou foi a conversa.";
  return [
    `<b>Família, o trimestre fechou sem reunião.</b>`,
    `Os números do ${d.sigla} estão prontos.${custo} Decisão que não é tomada à mesa acaba sendo tomada pelo próprio mês, e o mês sempre escolhe gastar.`,
    "No livro, Arkad lembra que o ouro foge de quem não lhe dá direção. Vocês têm o plano. O que faltou foi dar a direção.",
  ].join("\n\n");
}

/** O grupo é o chat_id negativo cadastrado em telegram_membros (mesma regra dos resumos). */
async function chatDoGrupo(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from("telegram_membros")
    .select("telegram_chat_id")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .lt("telegram_chat_id", 0)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Grupo do Telegram: ${error.message}`);
  if (!data) throw new Error("O grupo do Telegram não está cadastrado em telegram_membros.");
  return Number(data.telegram_chat_id);
}

/**
 * Uma chamada ao webhook do n8n, que manda no grupo pelo Arkad:
 * tipo=mensagem (texto) · tipo=pergunta (texto + botões) · tipo=documento (PDF).
 * Uma chamada por mensagem, em ordem: o nó do Telegram não repassa o binário
 * adiante, então texto e arquivo em sequência numa chamada só não dá.
 */
async function postarNoGrupo(campos: Record<string, string | Blob>, oQue: string, nomeArquivo = "arquivo.pdf") {
  const segredo = process.env.BANK_AGENTE_SECRET;
  if (!segredo) throw new Error("BANK_AGENTE_SECRET não configurada.");
  const corpo = new FormData();
  for (const [k, v] of Object.entries(campos)) {
    if (v instanceof Blob) corpo.append(k, v, nomeArquivo);
    else corpo.append(k, v);
  }
  const resposta = await fetch(process.env.N8N_WEBHOOK_BALANCO || WEBHOOK_PADRAO, {
    method: "POST",
    headers: { Authorization: `Bearer ${segredo}` },
    body: corpo,
  });
  if (!resposta.ok) throw new Error(`O n8n respondeu ${resposta.status} ao enviar ${oQue}.`);
}

/** Manda o balanço no grupo. `comMensagem`: o texto do dia 25 antes, quando não houve reunião. */
export async function enviarBalancoNoGrupo(supabase: SupabaseClient, trimestre: string, { comMensagem = true } = {}) {
  const [{ pdf, dados, nome }, chatId] = await Promise.all([gerarPdfBalanco(supabase, trimestre), chatDoGrupo(supabase)]);

  const mensagem = comMensagem ? mensagemSemReuniao(dados) : null;
  if (mensagem) await postarNoGrupo({ tipo: "mensagem", chat_id: String(chatId), mensagem }, "a mensagem");
  await postarNoGrupo(
    {
      tipo: "documento",
      chat_id: String(chatId),
      legenda: legendaDoBalanco(dados),
      nome,
      pdf: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    },
    "o balanço",
    nome,
  );
  const enviadoEm = new Date().toISOString();
  await supabase
    .from("balancos_trimestrais")
    .update({ enviado_em: enviadoEm })
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("trimestre", trimestre);
  return { sigla: dados.sigla, nome, enviadoEm };
}

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const siglaDe = (trimestre: string) => `${trimestre.slice(-1)}T${trimestre.slice(2, 4)}`;

/**
 * As decisões do trimestre no grupo: a cobrança (quem falta responder o quê,
 * pelo nome) e uma mensagem com botões por pergunta. Cada um responde por si.
 */
export async function enviarPerguntasNoGrupo(supabase: SupabaseClient, trimestre: string, prazo = "hoje, às 21h") {
  const [estado, chatId] = await Promise.all([lerDecisoes(supabase, trimestre), chatDoGrupo(supabase)]);
  if (estado.perguntas.length === 0) throw new Error(`Não há perguntas cadastradas para o ${siglaDe(trimestre)}.`);
  if (estado.fechadasEm) throw new Error(`As decisões do ${siglaDe(trimestre)} já fecharam.`);
  // O n8n tem um nó de botões fixos para 3 e outro para 4 opções.
  const foraDoFormato = estado.perguntas.find((p) => p.opcoes.length < 3 || p.opcoes.length > 4);
  if (foraDoFormato) throw new Error(`A pergunta ${foraDoFormato.numero} precisa ter 3 ou 4 opções.`);

  const abertura = [
    `<b>Família, antes do balanço do ${siglaDe(trimestre)} eu preciso das decisões de cada um.</b>`,
    `São ${estado.perguntas.length} perguntas, e cada um responde por si, nos botões. Dá pra mudar a resposta até o balanço sair.`,
    linhasDeCobranca(estado).join("\n"),
    `<b>Prazo: ${prazo}.</b> Quando os dois responderem, o balanço sai com as decisões. Se o prazo chegar antes, sai com o que houver, e pergunta sem resposta entra como não decidida.`,
  ].join("\n\n");
  await postarNoGrupo({ tipo: "mensagem", chat_id: String(chatId), mensagem: abertura }, "a cobrança");

  for (const p of estado.perguntas) {
    await postarNoGrupo(
      {
        tipo: "pergunta",
        chat_id: String(chatId),
        mensagem: `<b>${p.numero}.</b> ${escapar(p.texto)}`,
        teclado: JSON.stringify(tecladoDaPergunta(p)),
      },
      `a pergunta ${p.numero}`,
    );
  }

  await supabase
    .from("balancos_trimestrais")
    .update({ perguntas_enviadas_em: new Date().toISOString() })
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("trimestre", trimestre);
}

/**
 * Fecha as decisões e manda o balanço com elas: quando os dois terminam de
 * responder, ou no prazo (21h), com o que houver. Fecha uma vez só — marca
 * antes de enviar, pra dois cliques quase juntos não mandarem dois PDFs.
 */
export async function fecharDecisoes(supabase: SupabaseClient, trimestre: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("balancos_trimestrais")
    .update({ decisoes_fechadas_em: new Date().toISOString() })
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("trimestre", trimestre)
    .not("perguntas_enviadas_em", "is", null)
    .is("decisoes_fechadas_em", null)
    .select("id");
  if (error) throw new Error(`Fechar decisões: ${error.message}`);
  if (!data || data.length === 0) return false;
  await enviarBalancoNoGrupo(supabase, trimestre, { comMensagem: false });
  return true;
}
