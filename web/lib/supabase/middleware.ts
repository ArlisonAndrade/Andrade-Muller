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
  return pathname.startsWith("/api/bank/agente") || pathname === "/api/bank/investidor10";
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
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // A raiz É o hub (decisão do Arlison, 12/out/2026). Antes "/" era o FM
  // Gestão e o middleware adivinhava, pelo `Sec-Fetch-Site`, se a navegação
  // tinha vindo de fora pra mandar o visitante ao hub. Nunca funcionou no
  // navegador dele: o service worker (public/sw.js) intercepta toda navegação
  // e a reemite, e o pedido chega aqui como `same-origin` — abrir o site caía
  // sempre no FM. A heurística anterior, um cookie de sessão, tinha falhado
  // por outro motivo. Sem adivinhação não há o que falhar.
  return response;
}
