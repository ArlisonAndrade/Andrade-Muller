import { NextResponse } from "next/server";

// Ponte entre o /hub e o destino escolhido: seta o cookie de sessão que
// libera a raiz "/" (FM Gestão) sem cair de novo no /hub — ver
// web/lib/supabase/middleware.ts. Só o card do FM passa por aqui; "/bank"
// não precisa (o middleware não intercepta essa rota).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const destino = url.searchParams.get("destino") || "/";

  const response = NextResponse.redirect(new URL(destino, url.origin));
  // Sem maxAge: cookie de sessão, some ao fechar o navegador — assim o
  // /hub volta a aparecer na próxima vez que abrir o site.
  response.cookies.set("ambiente_escolhido", "1", { path: "/" });
  return response;
}
