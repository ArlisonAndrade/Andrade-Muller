import { autorizarAgente } from "@/lib/bank/agente/auth";
import { recategorizarTransacao } from "@/lib/bank/agente/executar";

// Clique num dos botões de categoria da confirmação. O callback_data do
// Telegram carrega "cat:<transacao_id>:<indice>" — índice, não uuid, porque
// o callback_data tem teto de 64 bytes e dois uuids não cabem.
//
// POST /api/bank/agente/categoria
// Body: { transacao_id, indice }
export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const transacaoId = String(corpo.transacao_id ?? "").trim();
  const indice = Number(corpo.indice);
  if (!transacaoId || !Number.isInteger(indice) || indice < 0) {
    return Response.json(
      { erro: "transacao_id e indice são obrigatórios" },
      { status: 400 },
    );
  }

  try {
    const texto = await recategorizarTransacao(acesso.supabase, transacaoId, indice);
    return Response.json({ texto });
  } catch (erro) {
    console.error("[agente/categoria]", erro);
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "erro inesperado" },
      { status: 500 },
    );
  }
}
