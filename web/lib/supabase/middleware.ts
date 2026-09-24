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

// Carregamento de documento que não veio de uma página do próprio site.
// Navegação client-side do Next (header `rsc`) nunca conta como entrada.
function entrouDeFora(request: NextRequest) {
  const h = request.headers;
  if (h.get("rsc")) return false;
  const dest = h.get("sec-fetch-dest");
  if (dest && dest !== "document") return false;

  const site = h.get("sec-fetch-site");
  if (site) return site === "none" || site === "cross-site";

  // Navegador sem Sec-Fetch-*: cai no Referer.
  const referer = h.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).origin !== request.nextUrl.origin;
  } catch {
    return true;
  }
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

  // "/" é o FM Gestão, mas quem abre o site (URL digitada, favorito, atalho
  // no celular, aba restaurada) tem que ver o /hub primeiro (decisão do
  // Arlison, 12/ago/2026). Antes isso dependia de um cookie de sessão
  // `ambiente_escolhido`, que falhava: navegador com "continuar de onde
  // parou" (e o do celular) nunca apaga cookie de sessão, e o prefetch do
  // <Link> do hub setava o cookie sem ninguém clicar — daí em diante tudo
  // caía direto no FM. Agora decide pela origem do request: entrada de fora
  // → /hub; navegação dentro do app (hub → FM, menu do FM) passa.
  if (user && pathname === "/" && entrouDeFora(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/hub";
    return NextResponse.redirect(url);
  }

  return response;
}
