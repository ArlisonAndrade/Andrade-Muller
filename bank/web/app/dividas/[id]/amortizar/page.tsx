import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { amortizarDivida } from "@/lib/acoes/dividas";
import { Card } from "@/components/ui/card";
import { moedaBRL } from "@/lib/formato";

export default async function AmortizarDivida({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: divida } = await supabase
    .from("dividas")
    .select("id, entidade_id, descricao, valor_total, valor_pago, parcelas_total, parcelas_pagas")
    .eq("id", id)
    .single();

  if (!divida) notFound();

  const { data: contas } = await supabase
    .from("contas")
    .select("id, nome")
    .eq("entidade_id", divida.entidade_id);

  const restante = Number(divida.valor_total) - Number(divida.valor_pago);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 font-serif text-2xl font-medium text-text-primary">
        Amortizar — {divida.descricao}
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Pago até agora: {moedaBRL(Number(divida.valor_pago))} de {moedaBRL(Number(divida.valor_total))}
        {" · "}Restam {moedaBRL(restante)}
        {divida.parcelas_total ? ` · ${divida.parcelas_pagas ?? 0}/${divida.parcelas_total} parcelas` : ""}
      </p>
      <Card>
        <form action={amortizarDivida} className="flex flex-col gap-4">
          <input type="hidden" name="divida_id" value={divida.id} />

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor pago agora
            <input
              name="valor_pagamento"
              type="number"
              step="0.01"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Parcelas amortizadas com esse pagamento
            <input
              name="parcelas_amortizadas"
              type="number"
              defaultValue="1"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Data do pagamento
            <input
              name="data"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Saiu de qual conta? (opcional)
            <select
              name="conta_id"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            >
              <option value="">— não lançar saída de caixa —</option>
              {(contas ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="mt-2 rounded-card bg-text-primary px-4 py-2 text-sm font-medium text-surface-2"
          >
            Registrar pagamento
          </button>
        </form>
      </Card>
    </div>
  );
}
