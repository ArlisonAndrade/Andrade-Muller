import { autorizarAgente } from "@/lib/bank/agente/auth";
import { montarContextoCompleto } from "@/lib/bank/agente/contexto";

// Retrato financeiro da família em JSON, para os fluxos agendados do n8n
// (fechamento do dia, da semana e do mês) montarem o prompt do resumo sem
// que a IA precise adivinhar nenhum número.
//
// GET /api/bank/agente/contexto
// Header: Authorization: Bearer <BANK_AGENTE_SECRET>
export async function GET(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  try {
    const contexto = await montarContextoCompleto(acesso.supabase);
    return Response.json(contexto);
  } catch (erro) {
    console.error("[agente/contexto]", erro);
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "erro inesperado" },
      { status: 500 },
    );
  }
}
