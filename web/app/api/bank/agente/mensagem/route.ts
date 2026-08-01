import { autorizarAgente } from "@/lib/bank/agente/auth";
import { processarMensagem, type MensagemTelegram } from "@/lib/bank/agente/executar";

// Entrada única do consultor do Telegram. O n8n só relaia: pega a mensagem do
// grupo, manda pra cá, e devolve `texto` ao grupo se `responder` for true.
// Toda a regra (identificação, interpretação, lançamento, dedup) vive no app,
// versionada junto com o resto do Bank.
//
// POST /api/bank/agente/mensagem
// Header: Authorization: Bearer <BANK_AGENTE_SECRET>
// Body:   { chat_id, message_id, user_id, nome, texto,
//           imagem_base64?, imagem_mime? }   ← foto de cupom
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
  const imagemBase64 = String(corpo.imagem_base64 ?? "").trim();
  const mimeRecebido = String(corpo.imagem_mime ?? "").trim();
  // O Telegram entrega foto sempre como JPEG; os outros formatos só chegam
  // aqui se a mensagem vier como documento.
  const MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const msg: MensagemTelegram = {
    chatId: Number(corpo.chat_id),
    messageId: Number(corpo.message_id),
    userId: Number(corpo.user_id),
    nome: String(corpo.nome ?? "").trim(),
    texto,
    imagem: imagemBase64
      ? {
          base64: imagemBase64,
          mime: MIMES.includes(mimeRecebido) ? mimeRecebido : "image/jpeg",
        }
      : null,
  };

  if (!Number.isFinite(msg.chatId) || !Number.isFinite(msg.userId)) {
    return Response.json({ erro: "chat_id e user_id são obrigatórios" }, { status: 400 });
  }
  // Sem texto e sem imagem (sticker, entrada no grupo) não é assunto do agente.
  if (!texto && !msg.imagem) {
    return Response.json({ responder: false, texto: "", desfazer_token: null });
  }

  try {
    const resultado = await processarMensagem(acesso.supabase, msg);
    return Response.json({
      responder: resultado.responder,
      texto: resultado.texto,
      desfazer_token: resultado.desfazerToken,
      // Botões de categoria quando o modelo não soube classificar.
      escolha_categoria: resultado.escolhaCategoria ?? null,
    });
  } catch (erro) {
    console.error("[agente/mensagem]", erro);
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "erro inesperado" },
      { status: 500 },
    );
  }
}
