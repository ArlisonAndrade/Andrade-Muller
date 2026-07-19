import { createClient } from "@/lib/supabase/server";
import { criarLancamento } from "@/lib/bank/acoes/lancamento";
import { Card } from "@/components/bank/ui/card";
import { ENTIDADE_FAMILIA, ENTIDADE_ARTHUR } from "@/lib/bank/tipos";

// CNPJ não aparece aqui — a vida financeira da consultoria fica só no FM Gestão.
const ENTIDADES = [
  { id: ENTIDADE_FAMILIA, nome: "Família Andrade Muller" },
  { id: ENTIDADE_ARTHUR, nome: "Carteira Arthur" },
];

export default async function NovoLancamento() {
  const supabase = await createClient();
  const [{ data: contas }, { data: categorias }] = await Promise.all([
    supabase.from("contas").select("id, nome, entidade_id"),
    supabase.from("categorias").select("id, nome, tipo, entidade_id"),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 font-serif text-2xl font-medium text-text-primary">
        Novo lançamento
      </h1>
      <Card>
        <form action={criarLancamento} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Entidade
            <select
              name="entidade_id"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            >
              {ENTIDADES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Conta
            <select
              name="conta_id"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            >
              <option value="">—</option>
              {(contas ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Categoria
            <select
              name="categoria_id"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            >
              <option value="">—</option>
              {(categorias ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.tipo})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Descrição
            <input
              name="descricao"
              type="text"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor
            <input
              name="valor"
              type="number"
              step="0.01"
              min="0"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Data
            <input
              name="data"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-card bg-text-primary px-4 py-2 text-sm font-medium text-surface-2"
          >
            Lançar
          </button>
        </form>
      </Card>
    </div>
  );
}
