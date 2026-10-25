import { autorizarAgente } from "@/lib/bank/agente/auth";
import { enviarPerguntasNoGrupo, fecharDecisoes } from "@/lib/bank/balanco/gerar";
import { trimestrePadrao } from "@/lib/bank/trimestre";

// Decisões do trimestre, chamadas pelo n8n (workflow "Decisões do trimestre").
//
// POST /api/bank/agente/decisoes { acao: "perguntar", t?, prazo? }
//   → cobrança + uma mensagem com botões por pergunta, no grupo
// POST /api/bank/agente/decisoes { acao: "prazo", t? }
//   → no prazo (21h do dia 25): fecha e manda o balanço com o que houver.
//     Se já fechou (os dois responderam antes), não faz nada.

export const maxDuration = 120;

const TRIMESTRE = /^\d{4}-T[1-4]$/;

export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;

  let corpo: { acao?: string; t?: string; prazo?: string } = {};
  try {
    corpo = await request.json();
  } catch {
    // corpo vazio cai na validação abaixo
  }
  const t = corpo.t ?? trimestrePadrao();
  if (!TRIMESTRE.test(t)) return Response.json({ erro: "trimestre inválido" }, { status: 400 });

  try {
    if (corpo.acao === "perguntar") {
      await enviarPerguntasNoGrupo(acesso.supabase, t, corpo.prazo || undefined);
      return Response.json({ ok: true, acao: "perguntar", t });
    }
    if (corpo.acao === "prazo") {
      const fechou = await fecharDecisoes(acesso.supabase, t);
      return Response.json({ ok: true, acao: "prazo", t, fechou });
    }
    return Response.json({ erro: 'acao deve ser "perguntar" ou "prazo"' }, { status: 400 });
  } catch (erro) {
    console.error("[agente/decisoes]", erro);
    return Response.json({ erro: erro instanceof Error ? erro.message : "erro nas decisões" }, { status: 500 });
  }
}
