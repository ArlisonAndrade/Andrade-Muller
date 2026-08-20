import type { SupabaseClient } from "@supabase/supabase-js";
import { moedaBRL } from "@/lib/bank/formato";
import { entraNaSemana, identificarMembro, montarContexto } from "@/lib/bank/agente/contexto";
import { interpretarMensagem } from "@/lib/bank/agente/interpretar";
import { hojeSP, somarDias } from "@/lib/bank/agente/datas";
import type {
  ContextoAgente,
  Interpretacao,
  LancamentoProposto,
  MembroTelegram,
  ResultadoAgente,
} from "@/lib/bank/agente/tipos";

export type MensagemTelegram = {
  chatId: number;
  messageId: number;
  userId: number;
  nome: string;
  texto: string;
  /** Foto de cupom/comprovante, quando a mensagem veio com imagem. */
  imagem?: { base64: string; mime: string } | null;
};

const SILENCIO: ResultadoAgente = {
  responder: false,
  texto: "",
  desfazerToken: null,
  escolhaCategoria: null,
};

/**
 * Caminho completo de uma mensagem do grupo: identifica quem falou, monta o
 * contexto, interpreta, grava e devolve o texto que o n8n manda de volta.
 */
export async function processarMensagem(
  supabase: SupabaseClient,
  msg: MensagemTelegram,
): Promise<ResultadoAgente> {
  const membro = await identificarMembro(supabase, msg.chatId, msg.userId);
  if (!membro) {
    // Onboarding: é assim que o Arlison descobre os ids para cadastrar em
    // telegram_membros. Nenhum dado financeiro sai daqui.
    return {
      responder: true,
      texto:
        "Ainda não te conheço, então não registrei nada.\n" +
        `chat_id: ${msg.chatId}\nuser_id: ${msg.userId}\n` +
        "Cadastre esse par em telegram_membros para eu passar a responder.",
      desfazerToken: null,
    };
  }

  // Idempotência: se o n8n reentregar a mesma mensagem (retry, restart do
  // container), o processamento para aqui — o dinheiro não pode ser lançado
  // duas vezes por causa de uma reentrega.
  const { data: jaProcessada } = await supabase
    .from("agente_mensagens")
    .select("id")
    .eq("telegram_chat_id", msg.chatId)
    .eq("telegram_message_id", msg.messageId)
    .maybeSingle();
  if (jaProcessada) return SILENCIO;

  const contexto = await montarContexto(supabase, membro);
  const autor =
    membro.pessoa_nome ?? membro.nome_telegram ?? msg.nome ?? "alguém da família";

  let interpretacao: Interpretacao;
  try {
    // chatId positivo = conversa 1:1; negativo = grupo. É o que decide se o
    // bot pode ficar em silêncio.
    interpretacao = await interpretarMensagem(
      contexto,
      msg.texto,
      autor,
      msg.imagem ?? null,
      msg.chatId > 0,
    );
  } catch (erro) {
    await registrarMensagem(supabase, membro, msg, "erro", null, [], null);
    return {
      responder: true,
      texto: `Não consegui processar isso agora (${erro instanceof Error ? erro.message : "erro desconhecido"}). Manda de novo?`,
      desfazerToken: null,
    };
  }

  if (interpretacao.acao === "ignorar") {
    await registrarMensagem(supabase, membro, msg, "ignorar", interpretacao, [], null);
    return SILENCIO;
  }

  if (interpretacao.acao === "responder") {
    const texto = interpretacao.resposta.trim();
    await registrarMensagem(supabase, membro, msg, "responder", interpretacao, [], texto);
    return { responder: texto.length > 0, texto, desfazerToken: null };
  }

  // ---- acao === "lancar" ----
  const { ids, confirmacoes, chutes, duplicados, incertos } = await gravarLancamentos(
    supabase,
    membro,
    contexto,
    msg,
    interpretacao.lancamentos,
  );

  // Nada gravado porque tudo já existia: reentrega que passou pela checagem
  // inicial (o log da primeira vez não chegou a ser escrito). Fica quieto —
  // o dinheiro já está lançado.
  if (ids.length === 0 && duplicados > 0) return SILENCIO;

  if (ids.length === 0) {
    const texto = "Entendi que era um gasto, mas não consegui achar o valor. Quanto foi?";
    await registrarMensagem(supabase, membro, msg, "responder", interpretacao, [], texto);
    return { responder: true, texto, desfazerToken: null };
  }

  const gastoSemana = await recalcularGastoSemana(supabase, contexto);
  const texto = montarResposta(
    confirmacoes,
    chutes,
    contexto,
    gastoSemana,
    interpretacao.resposta.trim(),
    incertos.length > 0,
  );
  const registro = await registrarMensagem(
    supabase,
    membro,
    msg,
    "lancar",
    interpretacao,
    ids,
    texto,
  );

  // Só o primeiro incerto vira botões: dois teclados na mesma mensagem não
  // cabem, e na prática a dúvida é de um item por vez.
  const escolhaCategoria =
    incertos.length > 0
      ? {
          transacaoId: incertos[0],
          opcoes: ordenarCategoriasSemanais(contexto.categorias).map((c, indice) => ({
            indice,
            nome: c.nome,
          })),
        }
      : null;

  return { responder: true, texto, desfazerToken: registro, escolhaCategoria };
}

/**
 * Ordem canônica das categorias da semana. É o contrato entre o botão
 * mostrado no Telegram e o índice que volta no clique — precisa ser a mesma
 * dos dois lados, então mora aqui e não em cada chamador.
 */
function ordenarCategoriasSemanais<T extends { nome: string; tipo: string; conta_na_semana: boolean }>(
  categorias: T[],
): T[] {
  return categorias
    .filter((c) => c.tipo === "despesa" && c.conta_na_semana)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Troca a categoria de um lançamento — o que os botões da confirmação fazem.
 * Devolve a frase curta que o n8n manda de volta ao grupo.
 */
export async function recategorizarTransacao(
  supabase: SupabaseClient,
  transacaoId: string,
  indice: number,
): Promise<string> {
  const { data: transacao } = await supabase
    .from("transacoes")
    .select("id, entidade_id, descricao")
    .eq("id", transacaoId)
    .maybeSingle();
  if (!transacao) return "Esse lançamento não existe mais.";

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome, tipo, conta_na_semana")
    .eq("entidade_id", transacao.entidade_id);

  const opcoes = ordenarCategoriasSemanais(
    (categorias ?? []) as { id: string; nome: string; tipo: string; conta_na_semana: boolean }[],
  );
  const escolhida = opcoes[indice];
  if (!escolhida) return "Não achei essa categoria.";

  const { error } = await supabase
    .from("transacoes")
    .update({ categoria_id: escolhida.id })
    .eq("id", transacaoId);
  if (error) throw new Error(`Falha ao recategorizar: ${error.message}`);

  return `Pronto — "${transacao.descricao}" agora está em ${escolhida.nome}.`;
}

// ---------- Gravação ----------

async function gravarLancamentos(
  supabase: SupabaseClient,
  membro: MembroTelegram,
  contexto: ContextoAgente,
  msg: MensagemTelegram,
  propostos: LancamentoProposto[],
) {
  const ids: string[] = [];
  const confirmacoes: string[] = [];
  const chutes: string[] = [];
  // Lançamentos cuja categoria o modelo não soube — viram botões, não "Outro".
  const incertos: string[] = [];
  let duplicados = 0;

  const categoriaOutros = contexto.categorias.find(
    (c) => c.nome.toLowerCase() === "outros" && c.tipo === "despesa",
  );

  for (const [indice, proposto] of propostos.entries()) {
    const valor = Number(proposto.valor);
    if (!Number.isFinite(valor) || valor <= 0) continue;

    // O id da categoria vem do modelo — só entra no banco se existir mesmo na
    // lista da família. Categoria inválida cai em "Outros" e vira aviso.
    const categoria =
      contexto.categorias.find((c) => c.id === proposto.categoria_id) ?? categoriaOutros ?? null;

    const forma = proposto.forma_pagamento;
    const cartao =
      forma === "credito"
        ? (contexto.cartoes.find((c) => c.id === proposto.cartao_id) ?? null)
        : null;

    const data = normalizarData(proposto.data, contexto.hoje);
    const descricao = proposto.descricao?.trim() || categoria?.nome || "Lançamento";

    const { data: inserida, error } = await supabase
      .from("transacoes")
      .insert({
        entidade_id: contexto.entidadeId,
        categoria_id: categoria?.id ?? null,
        pessoa_id: membro.pessoa_id,
        descricao,
        valor,
        data,
        forma_pagamento: forma,
        cartao_id: cartao?.id ?? null,
        origem: "telegram",
        origem_ref: `telegram:${msg.chatId}:${msg.messageId}#${indice}`,
      })
      .select("id")
      .single();

    // 23505 = unique_violation no origem_ref: a mensagem já tinha sido
    // lançada. Não é erro, é a reentrega sendo barrada.
    if (error) {
      if (error.code === "23505") {
        duplicados += 1;
        continue;
      }
      throw new Error(`Falha ao lançar: ${error.message}`);
    }

    ids.push(inserida.id);

    const partes = [moedaBRL(valor), categoria?.nome ?? "sem categoria"];
    if (cartao) partes.push(cartao.nome);
    else if (forma) partes.push(rotuloForma(forma));
    if (data !== contexto.hoje) partes.push(formatarDiaMes(data));
    confirmacoes.push(partes.join(" · "));

    if (proposto.confianca === "baixa" || !proposto.categoria_id) {
      chutes.push(descricao);
      incertos.push(inserida.id);
    }
  }

  return { ids, confirmacoes, chutes, duplicados, incertos };
}

async function registrarMensagem(
  supabase: SupabaseClient,
  membro: MembroTelegram,
  msg: MensagemTelegram,
  acao: "lancar" | "responder" | "ignorar" | "erro",
  interpretacao: Interpretacao | null,
  transacaoIds: string[],
  resposta: string | null,
): Promise<string | null> {
  const { data } = await supabase
    .from("agente_mensagens")
    .insert({
      entidade_id: membro.entidade_id,
      telegram_chat_id: msg.chatId,
      telegram_message_id: msg.messageId,
      telegram_user_id: msg.userId,
      pessoa_id: membro.pessoa_id,
      // Foto sem legenda tem texto vazio — deixa o rastro no log mesmo assim,
      // senão a linha fica sem nenhuma pista do que chegou.
      texto_recebido: msg.texto || (msg.imagem ? "[foto]" : ""),
      acao,
      interpretacao,
      transacao_ids: transacaoIds,
      resposta_enviada: resposta,
    })
    .select("id")
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Desfazer: apaga as transações daquela mensagem. Idempotente — desfazer duas
 * vezes não reclama nem apaga mais nada.
 */
export async function desfazerMensagem(
  supabase: SupabaseClient,
  agenteMensagemId: string,
): Promise<string> {
  const { data: registro } = await supabase
    .from("agente_mensagens")
    .select("id, transacao_ids, desfeita_em")
    .eq("id", agenteMensagemId)
    .maybeSingle();

  if (!registro) return "Não achei esse lançamento para desfazer.";
  if (registro.desfeita_em) return "Esse já tinha sido desfeito.";

  const ids = (registro.transacao_ids ?? []) as string[];
  if (ids.length > 0) {
    const { error } = await supabase.from("transacoes").delete().in("id", ids);
    if (error) throw new Error(`Falha ao desfazer: ${error.message}`);
  }

  await supabase
    .from("agente_mensagens")
    .update({ desfeita_em: new Date().toISOString() })
    .eq("id", agenteMensagemId);

  return ids.length === 1 ? "Desfeito — apaguei o lançamento." : `Desfeito — apaguei ${ids.length} lançamentos.`;
}

// ---------- Texto da resposta ----------

function montarResposta(
  confirmacoes: string[],
  chutes: string[],
  contexto: ContextoAgente,
  gastoSemana: number,
  comentario: string,
  temBotoes: boolean,
): string {
  const linhas = confirmacoes.map((c) => `✅ ${c}`);
  linhas.push(linhaSemana(contexto, gastoSemana));

  if (chutes.length > 0) {
    linhas.push(
      temBotoes
        ? `❓ Não tenho certeza da categoria de ${chutes.map((c) => `"${c}"`).join(", ")} — escolhe abaixo.`
        : `❓ Chutei a categoria de ${chutes.map((c) => `"${c}"`).join(", ")} — dá pra ajustar no extrato.`,
    );
  }
  if (comentario) linhas.push(`💡 ${comentario}`);

  return linhas.join("\n");
}

function linhaSemana(contexto: ContextoAgente, gasto: number): string {
  const { meta, diasRestantes } = contexto.semana;
  if (meta == null || meta <= 0) {
    return `Semana (seg–dom): ${moedaBRL(gasto)} gastos.`;
  }

  const percentual = Math.round((gasto / meta) * 100);
  if (gasto > meta) {
    return `Semana: ${moedaBRL(gasto)} de ${moedaBRL(meta)} (${percentual}%) — ${moedaBRL(gasto - meta)} acima da meta.`;
  }
  const dias = diasRestantes === 1 ? "último dia da semana" : `faltam ${diasRestantes} dias`;
  return `Semana: ${moedaBRL(gasto)} de ${moedaBRL(meta)} (${percentual}%) — ${dias}.`;
}

// ---------- Utilitários ----------

async function recalcularGastoSemana(
  supabase: SupabaseClient,
  contexto: ContextoAgente,
): Promise<number> {
  const { data } = await supabase
    .from("transacoes")
    .select("valor, categoria:categorias(tipo, conta_na_semana)")
    .eq("entidade_id", contexto.entidadeId)
    .gte("data", contexto.semana.inicio)
    .lte("data", contexto.semana.fim);

  const lista = (data ?? []) as unknown as {
    valor: number;
    categoria: { tipo: string; conta_na_semana: boolean | null } | null;
  }[];
  return lista
    .filter((t) => entraNaSemana(t.categoria))
    .reduce((soma, t) => soma + Number(t.valor), 0);
}

/** Rejeita data futura e qualquer coisa mais velha que um ano — nesses casos, hoje. */
function normalizarData(data: string | null, hoje: string): string {
  const iso = (data ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return hoje;
  if (iso > hoje) return hoje;
  if (iso < somarDias(hojeSP(), -365)) return hoje;
  return iso;
}

function formatarDiaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function rotuloForma(forma: string): string {
  const rotulos: Record<string, string> = {
    debito: "débito",
    credito: "crédito",
    pix: "PIX",
    dinheiro: "dinheiro",
    outro: "outro",
  };
  return rotulos[forma] ?? forma;
}
