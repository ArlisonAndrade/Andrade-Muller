import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client service-role — SÓ para rotas server-side sem sessão de usuário
// (ex.: cron de cotações). Nunca importar em código que vá pro browser.
// Requer SUPABASE_SERVICE_ROLE_KEY no ambiente (Vercel/.env.local);
// devolve null quando não configurado, pra rota degradar com 501.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createSupabaseClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchComRetentativa },
  });
}

const ESPERAS_MS = [1500, 4000, 8000];

/**
 * Depois de horas sem uso, as primeiras consultas ao Supabase voltam 504 por
 * alguns segundos (12 e 13/set/2026: o bot disse "não te conheço" pra
 * Franciele e o resumo de domingo saiu com R$ 0 e dívida zerada). Estas rotas
 * rodam justamente nesses horários (cron, primeira mensagem do dia), então
 * leitura que falhar com 502/503/504 tenta de novo. Escrita não repete: um
 * POST que expirou pode ter sido gravado.
 */
async function fetchComRetentativa(
  entrada: RequestInfo | URL,
  opcoes?: RequestInit,
): Promise<Response> {
  const metodo = (opcoes?.method ?? "GET").toUpperCase();
  const podeRepetir = metodo === "GET" || metodo === "HEAD";

  for (let tentativa = 0; ; tentativa++) {
    const ultima = !podeRepetir || tentativa >= ESPERAS_MS.length;
    try {
      const resposta = await fetch(entrada, opcoes);
      if (ultima || ![502, 503, 504].includes(resposta.status)) return resposta;
    } catch (erro) {
      if (ultima) throw erro;
    }
    await new Promise((r) => setTimeout(r, ESPERAS_MS[tentativa]));
  }
}
