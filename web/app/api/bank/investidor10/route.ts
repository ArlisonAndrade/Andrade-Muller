import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sincronizarInvestidor10 } from "@/lib/bank/investidor10";

// Sincronização diária da carteira com o Investidor10, chamada pelo Vercel
// Cron (web/vercel.json). Sem sessão: protegida por CRON_SECRET — a Vercel
// manda `Authorization: Bearer <CRON_SECRET>` sozinha quando a variável existe.
// O botão da página de investimentos NÃO passa por aqui (usa server action com
// a sessão do usuário).
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 501 });
  }

  const resultado = await sincronizarInvestidor10(supabase, "cron");
  // Falha vira 502 pra aparecer como erro no painel de Cron da Vercel, não "OK".
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}
