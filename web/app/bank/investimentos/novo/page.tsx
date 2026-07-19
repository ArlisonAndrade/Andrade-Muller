import { criarInvestimento } from "@/lib/bank/acoes/investimentos";
import { Card } from "@/components/bank/ui/card";
import { ENTIDADE_FAMILIA, ENTIDADE_ARTHUR } from "@/lib/bank/tipos";

const ENTIDADES = [
  { id: ENTIDADE_FAMILIA, nome: "Família Andrade Muller" },
  { id: ENTIDADE_ARTHUR, nome: "Carteira Arthur" },
];

export default function NovoInvestimento() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 font-serif text-2xl font-medium text-text-primary">Novo investimento</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Lança uma compra em carteira. Se o ticker já existir, só adiciona a movimentação.
      </p>
      <Card>
        <form action={criarInvestimento} className="flex flex-col gap-4">
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
            Ticker
            <input
              name="ticker"
              type="text"
              required
              placeholder="PETR4, MXRF11…"
              className="card-borda bg-surface-2 px-3 py-2 text-sm uppercase text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Tipo de ativo
            <select
              name="tipo_ativo"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            >
              <option value="acao">Ação</option>
              <option value="fii">FII</option>
              <option value="tesouro">Tesouro Direto</option>
              <option value="renda_fixa">Renda fixa</option>
              <option value="outro">Outro</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Nome do ativo (opcional)
            <input
              name="nome_ativo"
              type="text"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Quantidade
              <input
                name="quantidade"
                type="number"
                step="0.000001"
                required
                className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Preço unitário
              <input
                name="preco_unitario"
                type="number"
                step="0.0001"
                required
                className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Data da compra
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
            Salvar investimento
          </button>
        </form>
      </Card>
    </div>
  );
}
