import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

async function checarSetup() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      ok: false,
      mensagem:
        "Variáveis de ambiente ausentes — copie .env.local.example para .env.local e preencha com a URL e a anon key do projeto Supabase.",
    };
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("fm_clientes")
    .select("*", { count: "exact", head: true });

  if (error) {
    return {
      ok: false,
      mensagem: `Conexão com o Supabase falhou ou o schema ainda não foi rodado: ${error.message}`,
    };
  }

  if (count === 0) {
    return {
      ok: true,
      mensagem:
        "Conectado ao Supabase, mas nenhum cliente visível. Se o seed já rodou, falta login e vínculo em entidade_membros (RLS bloqueia acesso anônimo).",
    };
  }

  return {
    ok: true,
    mensagem: `Conectado ao Supabase — ${count} clientes visíveis. Setup completo.`,
  };
}

export default async function Dashboard() {
  const setup = await checarSetup();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
        Dashboard
      </h1>
      <p className="mb-8 text-sm text-ink-faint">
        Visão geral da FM Gestão e Estratégica
      </p>

      <Card title="Status do setup (etapa 1)">
        <p className={`text-sm ${setup.ok ? "text-salvia" : "text-terracota"}`}>
          {setup.mensagem}
        </p>
      </Card>

      <Card title="Próximas etapas" className="mt-6">
        <ol className="list-inside list-decimal space-y-1 text-sm text-ink-soft">
          <li className="line-through">Setup Next.js + Tailwind + Supabase</li>
          <li className="line-through">CRM + Funil de Vendas</li>
          <li>Reuniões</li>
          <li>Tarefas</li>
          <li>Faturamento / NFS-e</li>
          <li>Dashboard com gráficos</li>
          <li>Contratos e Metas/OKRs</li>
          <li>Checklist de Saúde Operacional</li>
        </ol>
      </Card>
    </div>
  );
}
