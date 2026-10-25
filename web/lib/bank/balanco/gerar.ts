import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { montarBalanco, type DadosBalanco } from "@/lib/bank/balanco/dados";
import { DocumentoBalanco } from "@/lib/bank/balanco/documento";

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
  return d.reuniao.realizada
    ? `<b>Família, aqui está o Balanço Patrimonial do ${d.sigla}.</b>\nOs compromissos que vocês firmaram estão na página 5. No ${d.proximaSigla} eu confiro cada um.`
    : `<b>Família, aqui está o Balanço Patrimonial do ${d.sigla}.</b>\nOs números estão completos. As decisões não: o trimestre fechou sem reunião familiar, e isso também ficou registrado no balanço.`;
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

export async function enviarBalancoNoGrupo(supabase: SupabaseClient, trimestre: string) {
  const segredo = process.env.BANK_AGENTE_SECRET;
  if (!segredo) throw new Error("BANK_AGENTE_SECRET não configurada.");

  const [{ pdf, dados, nome }, chatId] = await Promise.all([gerarPdfBalanco(supabase, trimestre), chatDoGrupo(supabase)]);

  // Duas chamadas ao mesmo webhook, em ordem: o texto (se houver) e depois o
  // arquivo. O nó do Telegram não repassa o binário adiante, então uma
  // chamada só não daria pra mandar texto e documento em sequência.
  const postar = async (campos: Record<string, string | Blob>, oQue: string) => {
    const corpo = new FormData();
    for (const [k, v] of Object.entries(campos)) {
      if (v instanceof Blob) corpo.append(k, v, nome);
      else corpo.append(k, v);
    }
    const resposta = await fetch(process.env.N8N_WEBHOOK_BALANCO || WEBHOOK_PADRAO, {
      method: "POST",
      headers: { Authorization: `Bearer ${segredo}` },
      body: corpo,
    });
    if (!resposta.ok) throw new Error(`O n8n respondeu ${resposta.status} ao enviar ${oQue}.`);
  };

  const mensagem = mensagemSemReuniao(dados);
  if (mensagem) await postar({ tipo: "mensagem", chat_id: String(chatId), mensagem }, "a mensagem");
  await postar(
    {
      tipo: "documento",
      chat_id: String(chatId),
      legenda: legendaDoBalanco(dados),
      nome,
      pdf: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    },
    "o balanço",
  );
  const enviadoEm = new Date().toISOString();
  await supabase
    .from("balancos_trimestrais")
    .update({ enviado_em: enviadoEm })
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("trimestre", trimestre);
  return { sigla: dados.sigla, nome, enviadoEm };
}
