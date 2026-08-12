import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Atualiza a sessão do Supabase a cada request e fecha o acesso a quem não
// fez login com Google — único ponto de entrada do ecossistema é /entrar
// (unificação do painel, decisão 14/jul/2026).
// Rotas de API que se autenticam por segredo próprio no header (Bearer), e
// não por cookie de sessão: o n8n do consultor do Telegram e o cron de
// cotações não têm browser. Sem esta saída antecipada elas eram redirecionadas
// para /entrar e nunca chegavam a rodar.
function autenticaPorSegredo(pathname: string) {
  return pathname.startsWith("/api/bank/agente") || pathname === "/api/bank/cotacoes";
}

export async function updateSession(request: NextRequest) {
  if (autenticaPorSegredo(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const rotaPublica = pathname === "/entrar" || pathname.startsWith("/auth/callback");

  if (!user && !rotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/entrar") {
    const url = request.nextUrl.clone();
    url.pathname = "/hub";
    return NextResponse.redirect(url);
  }

  // "/" é o FM Gestão, mas com sessão já ativa (o caso comum no dia a dia —
  // ninguém passa pelo /entrar toda vez) o middleware nunca tocava nessa
  // rota, então abrir o site direto sempre caía no FM sem nunca mostrar o
  // /hub (decisão do Arlison, 12/ago/2026 — fecha a "opção aberta" do
  // CLAUDE.md). Mostra o /hub na primeira vez da sessão do navegador; o
  // cookie `ambiente_escolhido` (setado por /hub/ir ao clicar no card do FM)
  // libera a partir daí, senão clicar "FM Gestão" no hub voltaria pro hub
  // de novo (loop).
  if (user && pathname === "/" && !request.cookies.get("ambiente_escolhido")) {
    const url = request.nextUrl.clone();
    url.pathname = "/hub";
    return NextResponse.redirect(url);
  }

  return response;
}
