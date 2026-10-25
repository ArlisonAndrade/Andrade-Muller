import { autorizarAgente } from "@/lib/bank/agente/auth";
import { enviarPerguntasNoGrupo, fecharDecisoes } from "@/lib/bank/balanco/gerar";
import { rodarDia15, rodarDia25, rodarDia5 } from "@/lib/bank/balanco/ciclo";
import { trimestrePadrao } from "@/lib/bank/trimestre";

// O ciclo trimestral, chamado pelo n8n (workflow "Decisões do trimestre"),
// só em jan, abr, jul e out — o mês seguinte ao fechamento do trimestre.
//
// POST /api/bank/agente/decisoes { acao, t? }
//   "dia5"      → 9h do dia 5: convocação da reunião + decisões com botões
//   "dia15"     → 9h do dia 15: só se a reunião não foi feita, cobra de novo
//   "dia25"     → 9h do dia 25: custo de não ter feito a reunião, e o balanço
//                 (agora, se as decisões estão completas; senão cobrança)
//   "prazo"     → 21h do dia 25: fecha e manda o balanço com o que houver
//   "perguntar" → manda as perguntas na hora (disparo manual)
// Sem `t`, vale o trimestre que acabou de fechar.

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
    switch (corpo.acao) {
      case "dia5":
        return Response.json({ ok: true, ...(await rodarDia5(acesso.supabase, t)) });
      case "dia15":
        return Response.json({ ok: true, ...(await rodarDia15(acesso.supabase, t)) });
      case "dia25":
        return Response.json({ ok: true, ...(await rodarDia25(acesso.supabase, t)) });
      case "prazo":
        return Response.json({ ok: true, acao: "prazo", t, fechou: await fecharDecisoes(acesso.supabase, t) });
      case "perguntar":
        await enviarPerguntasNoGrupo(acesso.supabase, t, corpo.prazo ? { prazo: corpo.prazo } : {});
        return Response.json({ ok: true, acao: "perguntar", t });
      default:
        return Response.json({ erro: 'acao deve ser "dia5", "dia15", "dia25", "prazo" ou "perguntar"' }, { status: 400 });
    }
  } catch (erro) {
    console.error("[agente/decisoes]", erro);
    return Response.json({ erro: erro instanceof Error ? erro.message : "erro nas decisões" }, { status: 500 });
  }
}
