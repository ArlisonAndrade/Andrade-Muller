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
  });
}
