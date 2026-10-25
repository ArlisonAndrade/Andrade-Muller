import { autorizarAgente } from "@/lib/bank/agente/auth";
import { marcarReuniaoFeita } from "@/lib/bank/balanco/ciclo";

// Clique em "✅ Já fizemos a reunião" (callback "reu:<trimestre>") da
// convocação do dia 5 e da cobrança do dia 15, encaminhado pelo workflow do
// consultor no n8n. Registra a reunião do trimestre — e o dia 15 fica quieto.
//
// POST /api/bank/agente/reuniao  { trimestre, user_id }

export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  let corpo: { trimestre?: string; user_id?: number } = {};
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }
  if (!corpo.trimestre || corpo.user_id == null) {
    return Response.json({ erro: "faltam trimestre e user_id" }, { status: 400 });
  }

  try {
    const texto = await marcarReuniaoFeita(acesso.supabase, corpo.trimestre, Number(corpo.user_id));
    return Response.json({ responder: true, texto });
  } catch (erro) {
    console.error("[agente/reuniao]", erro);
    return Response.json({ responder: true, texto: "Não consegui registrar a reunião agora. Toca no botão de novo daqui a pouco." });
  }
}
