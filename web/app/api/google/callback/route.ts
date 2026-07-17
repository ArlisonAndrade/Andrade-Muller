import { NextResponse, type NextRequest } from "next/server";
import { trocarCodigoPorTokens } from "@/lib/google/oauth";
import { salvarConexao } from "@/lib/google/calendar";

// Retorno do Google: valida o state, troca o código por tokens e guarda a
// conexão. O usuário fez o login no próprio Google — nunca vemos a senha dele.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erro = url.searchParams.get("error");
  const stateCookie = request.cookies.get("google_oauth_state")?.value;

  const voltar = (status: string) =>
    NextResponse.redirect(new URL(`/reunioes?google=${status}`, request.url));

  if (erro) return voltar("negado");
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return voltar("estado_invalido");
  }

  try {
    const tokens = await trocarCodigoPorTokens(code);
    if (!tokens.refresh_token) {
      // Sem refresh token não dá para renovar depois; peça reconsentimento.
      return voltar("sem_refresh");
    }
    await salvarConexao({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
  } catch {
    return voltar("falha");
  }

  const resp = voltar("conectado");
  resp.cookies.delete("google_oauth_state");
  return resp;
}
