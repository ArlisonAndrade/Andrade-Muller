import { createClient } from "@supabase/supabase-js";

// Cliente com service_role — só usado no servidor (nunca expor ao client),
// pra gerar o link de handoff de sessão pro Bank (ver app/api/bank-sso).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
