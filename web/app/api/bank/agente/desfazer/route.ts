import { autorizarAgente } from "@/lib/bank/agente/auth";
import { desfazerMensagem } from "@/lib/bank/agente/executar";

// Botão "↩ desfazer" da confirmação. O callback_data do Telegram carrega o id
// da linha em agente_mensagens; aqui as transações daquela mensagem são
// apagadas. É o que permite lançar direto sem pedir confirmação antes.
//
// POST /api/bank/agente/desfazer
// Body: { token }
export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const token = String(corpo.token ?? "").trim();
  if (!token) return Response.json({ erro: "token é obrigatório" }, { status: 400 });

  try {
    const texto = await desfazerMensagem(acesso.supabase, token);
    return Response.json({ texto });
  } catch (erro) {
    console.error("[agente/desfazer]", erro);
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "erro inesperado" },
      { status: 500 },
    );
  }
}
