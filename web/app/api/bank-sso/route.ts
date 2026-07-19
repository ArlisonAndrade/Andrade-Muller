import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// SSO pro Andrade Muller Bank: gera um magic link de uso único pro e-mail
// do usuário já logado aqui e manda pro handoff do Bank, que troca esse
// token por uma sessão própria (domínios .vercel.app diferentes não
// compartilham cookie — isso evita pedir login de novo lá).
export async function GET(request: NextRequest) {
  const urlBank = process.env.NEXT_PUBLIC_BANK_URL;
  if (!urlBank) {
    return NextResponse.redirect(new URL("/hub", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });

  if (error || !data?.properties?.hashed_token) {
    return NextResponse.redirect(new URL("/hub?bank_sso=erro", request.url));
  }

  const destino = new URL("/auth/handoff", urlBank);
  destino.searchParams.set("token_hash", data.properties.hashed_token);
  destino.searchParams.set("type", "magiclink");
  return NextResponse.redirect(destino);
}
