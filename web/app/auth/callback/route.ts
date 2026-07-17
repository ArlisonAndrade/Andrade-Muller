import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o code do OAuth do Google por uma sessão Supabase e redireciona para
// o destino pedido pelo botão de login (padrão da tela em (entrada)/entrar).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/hub";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar?erro=falha`);
}
