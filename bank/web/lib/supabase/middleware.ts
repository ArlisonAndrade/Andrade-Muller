import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Fecha o Bank atrás de login — antes disso não havia proxy nenhum aqui,
// só funcionava porque as tabelas tinham policy dev_anon_* liberando
// acesso anônimo no banco (removidas). Sessão vem via handoff de
// /auth/handoff (ver web/app/api/bank-sso), não tem tela de login própria.
export async function updateSession(request: NextRequest) {
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
  const rotaPublica = pathname.startsWith("/auth/handoff");

  if (!user && !rotaPublica) {
    const fmUrl = process.env.NEXT_PUBLIC_FM_URL ?? "http://localhost:3000";
    const url = new URL("/entrar", fmUrl);
    return NextResponse.redirect(url);
  }

  return response;
}
