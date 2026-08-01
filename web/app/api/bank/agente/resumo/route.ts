import { autorizarAgente } from "@/lib/bank/agente/auth";
import { gerarResumo, type TipoResumo } from "@/lib/bank/agente/resumo";

const TIPOS: TipoResumo[] = ["diario", "semanal", "mensal"];

// Camada proativa (Fase C): o n8n chama isto num Schedule Trigger e manda o
// texto ao grupo — se houver texto. `enviar: false` é resposta legítima e
// frequente; o nó do Telegram só dispara quando ela vem true.
//
// POST /api/bank/agente/resumo
// Header: Authorization: Bearer <BANK_AGENTE_SECRET>
// Body:   { tipo: "diario" | "semanal" | "mensal" }
export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  let corpo: Record<string, unknown> = {};
  try {
    corpo = await request.json();
  } catch {
    // Corpo vazio vale como resumo diário — simplifica o nó do n8n.
  }

  const tipo = String(corpo.tipo ?? "diario") as TipoResumo;
  if (!TIPOS.includes(tipo)) {
    return Response.json({ erro: `tipo deve ser um de: ${TIPOS.join(", ")}` }, { status: 400 });
  }

  try {
    const resultado = await gerarResumo(acesso.supabase, tipo);
    return Response.json({
      enviar: resultado.enviar,
      texto: resultado.texto,
      chat_id: resultado.chatId,
    });
  } catch (erro) {
    console.error("[agente/resumo]", erro);
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "erro inesperado" },
      { status: 500 },
    );
  }
}
