import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { FormRapido } from "@/components/bank/lancar/form-rapido";

export const metadata = { title: "Lançar" };

// Lançamento rápido — a tela de todo dia, otimizada pro celular: valor,
// um toque na categoria, forma de pagamento e pronto. Entidade fixa na
// Família (Arthur e CNPJ têm fluxos próprios: investimentos e ponte).
export default async function PaginaLancar({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const supabase = await createClient();
  const { salvo } = await searchParams;

  const [{ data: categorias }, { data: cartoes }, { data: contas }, { data: recentes }] =
    await Promise.all([
      supabase
        .from("categorias")
        .select("id, nome, tipo, grupo_orcamento")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
      supabase
        .from("cartoes")
        .select("id, nome")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
      supabase
        .from("contas")
        .select("id, nome")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .order("nome"),
      supabase
        .from("transacoes")
        .select("forma_pagamento, cartao_id, categoria_id")
        .eq("entidade_id", ENTIDADE_FAMILIA)
        .not("forma_pagamento", "is", null)
        .order("data", { ascending: false })
        .limit(10),
    ]);

  return (
    <div className="mx-auto max-w-lg">
      <FormRapido
        entidadeId={ENTIDADE_FAMILIA}
        categorias={categorias ?? []}
        cartoes={cartoes ?? []}
        contas={contas ?? []}
        recentes={recentes ?? []}
        salvo={salvo === "1"}
      />
    </div>
  );
}
