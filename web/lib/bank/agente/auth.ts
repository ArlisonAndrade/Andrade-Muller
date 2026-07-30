import { createAdminClient } from "@/lib/supabase/admin";

// As rotas do agente são chamadas pelo n8n, que não tem sessão de browser —
// por isso usam service-role + um segredo compartilhado no header, no mesmo
// espírito do CRON_SECRET de /api/bank/cotacoes.

type ClientAdmin = NonNullable<ReturnType<typeof createAdminClient>>;

export type AcessoAgente =
  | { ok: true; supabase: ClientAdmin }
  | { ok: false; resposta: Response };

export function autorizarAgente(request: Request): AcessoAgente {
  const segredo = process.env.BANK_AGENTE_SECRET;
  if (!segredo) {
    return {
      ok: false,
      resposta: Response.json({ erro: "BANK_AGENTE_SECRET não configurada" }, { status: 501 }),
    };
  }

  if (request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return { ok: false, resposta: Response.json({ erro: "não autorizado" }, { status: 401 }) };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      resposta: Response.json(
        { erro: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
        { status: 501 },
      ),
    };
  }

  return { ok: true, supabase };
}
