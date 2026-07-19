import { criarDivida } from "@/lib/bank/acoes/dividas";
import { Card } from "@/components/bank/ui/card";
import { ENTIDADE_FAMILIA, ENTIDADE_ARTHUR } from "@/lib/bank/tipos";

const ENTIDADES = [
  { id: ENTIDADE_FAMILIA, nome: "Família Andrade Muller" },
  { id: ENTIDADE_ARTHUR, nome: "Carteira Arthur" },
];

export default function NovaDivida() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 font-serif text-2xl font-medium text-text-primary">Nova dívida</h1>
      <Card>
        <form action={criarDivida} className="flex flex-col gap-4">
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
            Descrição
            <input
              name="descricao"
              type="text"
              required
              placeholder="Financiamento veículo, cartão parcelado…"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Valor total
              <input
                name="valor_total"
                type="number"
                step="0.01"
                required
                className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Valor já pago
              <input
                name="valor_pago"
                type="number"
                step="0.01"
                defaultValue="0"
                className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Parcelas totais
              <input
                name="parcelas_total"
                type="number"
                className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Parcelas pagas
              <input
                name="parcelas_pagas"
                type="number"
                defaultValue="0"
                className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Taxa de juros mensal (%, opcional)
            <input
              name="taxa_juros_mensal"
              type="number"
              step="0.0001"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Próximo vencimento
            <input
              name="data_vencimento_proxima"
              type="date"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-card bg-text-primary px-4 py-2 text-sm font-medium text-surface-2"
          >
            Salvar dívida
          </button>
        </form>
      </Card>
    </div>
  );
}
