import { createClient } from "@/lib/supabase/server";
import { enviarBalancoNoGrupo, gerarPdfBalanco } from "@/lib/bank/balanco/gerar";
import { trimestrePadrao } from "@/lib/bank/trimestre";

// Balanço Patrimonial Trimestral (botões do Modo TV). Sessão do usuário, como
// qualquer página do Bank: o proxy já exige login e o RLS limita aos dados da
// família.
//
// GET  /api/bank/balanco?t=2026-T3  → o PDF, para conferir antes de mandar
// POST /api/bank/balanco  { t }     → gera e manda no grupo pelo Arkad

// O parecer é escrito pelo modelo na primeira geração do trimestre.
export const maxDuration = 120;

const TRIMESTRE = /^\d{4}-T[1-4]$/;

export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? trimestrePadrao();
  if (!TRIMESTRE.test(t)) return Response.json({ erro: "trimestre inválido" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { pdf, nome } = await gerarPdfBalanco(supabase, t);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (erro) {
    console.error("[balanco] gerar", erro);
    return Response.json({ erro: erro instanceof Error ? erro.message : "erro ao gerar o balanço" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let t = trimestrePadrao();
  try {
    const corpo = (await request.json()) as { t?: string };
    if (corpo.t) t = corpo.t;
  } catch {
    // corpo vazio = trimestre que acabou de fechar
  }
  if (!TRIMESTRE.test(t)) return Response.json({ erro: "trimestre inválido" }, { status: 400 });

  try {
    const supabase = await createClient();
    const resultado = await enviarBalancoNoGrupo(supabase, t);
    return Response.json({ ok: true, ...resultado });
  } catch (erro) {
    console.error("[balanco] enviar", erro);
    return Response.json({ ok: false, erro: erro instanceof Error ? erro.message : "erro ao enviar o balanço" }, { status: 500 });
  }
}
