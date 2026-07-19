import { criarMeta } from "@/lib/bank/acoes/metas";
import { Card } from "@/components/bank/ui/card";
import { ENTIDADE_FAMILIA, ENTIDADE_ARTHUR } from "@/lib/bank/tipos";

const ENTIDADES = [
  { id: ENTIDADE_FAMILIA, nome: "Família Andrade Muller" },
  { id: ENTIDADE_ARTHUR, nome: "Carteira Arthur" },
];

export default function NovaMeta() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 font-serif text-2xl font-medium text-text-primary">Nova meta</h1>
      <Card>
        <form action={criarMeta} className="flex flex-col gap-4">
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
            Título
            <input
              name="titulo"
              type="text"
              required
              placeholder="Reserva de emergência, Viagem…"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor alvo
            <input
              name="valor_alvo"
              type="number"
              step="0.01"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor já acumulado
            <input
              name="valor_atual"
              type="number"
              step="0.01"
              defaultValue="0"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Data alvo (opcional)
            <input
              name="data_alvo"
              type="date"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-card bg-text-primary px-4 py-2 text-sm font-medium text-surface-2"
          >
            Salvar meta
          </button>
        </form>
      </Card>
    </div>
  );
}
