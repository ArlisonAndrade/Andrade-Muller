import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recebe o token de handoff gerado pelo /api/bank-sso do FM Gestão e troca
// por uma sessão própria aqui (domínio .vercel.app diferente, cookie não
// atravessa sozinho — ver web/app/api/bank-sso/route.ts pro outro lado).
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "magiclink") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (error) {
    return NextResponse.redirect(new URL("/?sso=erro", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
