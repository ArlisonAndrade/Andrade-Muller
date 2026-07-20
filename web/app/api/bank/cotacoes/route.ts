import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { atualizarCotacoesB3 } from "@/lib/bank/cotacoes";

// Atualização de cotações sem sessão (Vercel Cron na Fase 7, ou curl
// manual). Protegida por CRON_SECRET: `Authorization: Bearer <segredo>`
// (padrão do Vercel Cron) ou `?secret=`. O botão "Atualizar cotações" da
// página de investimentos NÃO passa por aqui — usa server action com a
// sessão do usuário.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const autorizado =
    !!segredo &&
    (request.headers.get("authorization") === `Bearer ${segredo}` ||
      url.searchParams.get("secret") === segredo);
  if (!autorizado) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { erro: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 501 },
    );
  }

  const resultado = await atualizarCotacoesB3(supabase);
  return NextResponse.json(resultado);
}
