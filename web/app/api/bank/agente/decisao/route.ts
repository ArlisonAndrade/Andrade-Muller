import { after } from "next/server";
import { autorizarAgente } from "@/lib/bank/agente/auth";
import { registrarDecisao } from "@/lib/bank/balanco/decisoes";
import { fecharDecisoes } from "@/lib/bank/balanco/gerar";

// Clique num botão de decisão do trimestre (callback "dec:<pergunta>:<opção>"),
// encaminhado pelo workflow do consultor no n8n. Grava a escolha de QUEM
// clicou e devolve a frase que o Arkad responde no grupo. Quando o último
// responde, o balanço com as decisões sai logo depois da resposta (after: a
// confirmação chega no grupo antes do PDF).
//
// POST /api/bank/agente/decisao  { pergunta_id, indice, user_id }

export const maxDuration = 120;

export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  let corpo: { pergunta_id?: string; indice?: number; user_id?: number } = {};
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }
  if (!corpo.pergunta_id || corpo.user_id == null) {
    return Response.json({ erro: "faltam pergunta_id e user_id" }, { status: 400 });
  }

  try {
    const resultado = await registrarDecisao(acesso.supabase, {
      perguntaId: corpo.pergunta_id,
      indice: Number(corpo.indice),
      userId: Number(corpo.user_id),
    });
    if (resultado.completou && resultado.trimestre) {
      const trimestre = resultado.trimestre;
      after(async () => {
        try {
          await fecharDecisoes(acesso.supabase, trimestre);
        } catch (erro) {
          console.error("[agente/decisao] fechar", erro);
        }
      });
    }
    return Response.json({ responder: true, texto: resultado.texto });
  } catch (erro) {
    console.error("[agente/decisao]", erro);
    return Response.json({
      responder: true,
      texto: "Não consegui registrar essa decisão agora. Toca no botão de novo daqui a pouco.",
    });
  }
}
