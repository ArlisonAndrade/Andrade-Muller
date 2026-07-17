// OAuth do Google só para a integração de calendário (decisão 12/jul/2026).
// Não é o login do painel — é uma conexão de integração cujo refresh token
// fica guardado no servidor. Falamos direto com os endpoints REST do Google
// para não puxar a dependência pesada do googleapis.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

// calendar = ler/escrever eventos; email/openid = saber qual conta conectou.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

export function googleConfigurado(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

export function urlAutorizacao(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // pede refresh token
    prompt: "consent", // força vir refresh token mesmo em reconexão
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface TokensGoogle {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // segundos
  scope?: string;
  token_type?: string;
}

export async function trocarCodigoPorTokens(code: string): Promise<TokensGoogle> {
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  if (!resp.ok) {
    throw new Error(`Google recusou a troca do código: ${await resp.text()}`);
  }
  return resp.json();
}

export async function renovarAccessToken(
  refreshToken: string,
): Promise<TokensGoogle> {
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) {
    throw new Error(`Falha ao renovar token do Google: ${await resp.text()}`);
  }
  return resp.json();
}

export async function emailDaConta(accessToken: string): Promise<string | null> {
  const resp = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { email?: string };
  return data.email ?? null;
}
