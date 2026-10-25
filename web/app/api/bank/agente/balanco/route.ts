import { autorizarAgente } from "@/lib/bank/agente/auth";
import { gerarPdfBalanco, legendaDoBalanco, mensagemSemReuniao } from "@/lib/bank/balanco/gerar";
import { trimestrePadrao } from "@/lib/bank/trimestre";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";

// O balanço trimestral para o n8n (workflow "Balanço do dia 25"): o n8n busca
// aqui o que mandar e manda pelo bot Arkad — mesmo caminho dos resumos, com o
// mesmo segredo. Sem sessão: service-role + Bearer BANK_AGENTE_SECRET.
//
// GET  ?t=2026-T3&formato=json → { chat_id, mensagem, legenda, nome }
// GET  ?t=2026-T3&formato=pdf  → o PDF
// POST { t }                   → marca como enviado (depois do Telegram)

export const maxDuration = 120;

const TRIMESTRE = /^\d{4}-T[1-4]$/;

export async function GET(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;
  const url = new URL(request.url);
  const t = url.searchParams.get("t") ?? trimestrePadrao();
  if (!TRIMESTRE.test(t)) return Response.json({ erro: "trimestre inválido" }, { status: 400 });

  try {
    const { pdf, dados, nome } = await gerarPdfBalanco(acesso.supabase, t);
    if (url.searchParams.get("formato") === "pdf") {
      return new Response(new Uint8Array(pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"` },
      });
    }
    const { data: grupo, error } = await acesso.supabase
      .from("telegram_membros")
      .select("telegram_chat_id")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .lt("telegram_chat_id", 0)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Grupo do Telegram: ${error.message}`);
    return Response.json({
      chat_id: grupo ? Number(grupo.telegram_chat_id) : null,
      mensagem: mensagemSemReuniao(dados) ?? "",
      legenda: legendaDoBalanco(dados),
      nome,
      sigla: dados.sigla,
    });
  } catch (erro) {
    console.error("[agente/balanco]", erro);
    return Response.json({ erro: erro instanceof Error ? erro.message : "erro ao gerar o balanço" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const acesso = autorizarAgente(request);
  if (!acesso.ok) return acesso.resposta;
  let t = trimestrePadrao();
  try {
    const corpo = (await request.json()) as { t?: string };
    if (corpo.t) t = corpo.t;
  } catch {
    // corpo vazio = trimestre que acabou de fechar
  }
  if (!TRIMESTRE.test(t)) return Response.json({ erro: "trimestre inválido" }, { status: 400 });
  const { error } = await acesso.supabase
    .from("balancos_trimestrais")
    .update({ enviado_em: new Date().toISOString() })
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("trimestre", t);
  if (error) return Response.json({ erro: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
