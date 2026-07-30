import { autorizarAgente } from "@/lib/bank/agente/auth";
import { processarMensagem, type MensagemTelegram } from "@/lib/bank/agente/executar";

// Entrada única do consultor do Telegram. O n8n só relaia: pega a mensagem do
// grupo, manda pra cá, e devolve `texto` ao grupo se `responder` for true.
// Toda a regra (identificação, interpretação, lançamento, dedup) vive no app,
// versionada junto com o resto do Bank.
//
// POST /api/bank/agente/mensagem
// Header: Authorization: Bearer <BANK_AGENTE_SECRET>
// Body:   { chat_id, message_id, user_id, nome, texto }
export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const texto = String(corpo.texto ?? "").trim();
  const msg: MensagemTelegram = {
    chatId: Number(corpo.chat_id),
    messageId: Number(corpo.message_id),
    userId: Number(corpo.user_id),
    nome: String(corpo.nome ?? "").trim(),
    texto,
  };

  if (!Number.isFinite(msg.chatId) || !Number.isFinite(msg.userId)) {
    return Response.json({ erro: "chat_id e user_id são obrigatórios" }, { status: 400 });
  }
  // Mensagem sem texto (foto, sticker, entrada no grupo) não é assunto do
  // agente ainda — foto de cupom fica para a fase de OCR.
  if (!texto) return Response.json({ responder: false, texto: "", desfazer_token: null });

  try {
    const resultado = await processarMensagem(acesso.supabase, msg);
    return Response.json({
      responder: resultado.responder,
      texto: resultado.texto,
      desfazer_token: resultado.desfazerToken,
    });
  } catch (erro) {
    console.error("[agente/mensagem]", erro);
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "erro inesperado" },
      { status: 500 },
    );
  }
}
