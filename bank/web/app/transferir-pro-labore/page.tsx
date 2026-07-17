import { transferirProLabore } from "@/lib/acoes/pro-labore";
import { Card } from "@/components/ui/card";

export default function TransferirProLabore() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 font-serif text-2xl font-medium text-text-primary">
        Transferir pró-labore
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Lança 1x no CNPJ e espelha automaticamente na Família — sem lançar duas vezes na mão.
      </p>
      <Card>
        <form action={transferirProLabore} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Tipo
            <select
              name="tipo"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            >
              <option value="pro_labore_franciele">Pró-labore — Franciele</option>
              <option value="dividendos_franciele">Dividendos — Franciele</option>
            </select>
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
            Transferir
          </button>
        </form>
      </Card>
    </div>
  );
}
