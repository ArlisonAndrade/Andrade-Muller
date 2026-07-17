import { NextResponse, type NextRequest } from "next/server";
import { googleConfigurado, urlAutorizacao } from "@/lib/google/oauth";

// Inicia o fluxo OAuth: gera um state anti-CSRF (cookie httpOnly) e manda
// o navegador para a tela de consentimento do Google.
export async function GET(request: NextRequest) {
  if (!googleConfigurado()) {
    return NextResponse.redirect(
      new URL("/reunioes?google=nao_configurado", request.url),
    );
  }

  const state = crypto.randomUUID();
  const resp = NextResponse.redirect(urlAutorizacao(state));
  resp.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 min para concluir o consentimento
  });
  return resp;
}
