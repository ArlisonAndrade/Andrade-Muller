import { criarConta } from "@/lib/bank/acoes/contas";
import { Card } from "@/components/bank/ui/card";
import { ENTIDADE_FAMILIA, ENTIDADE_ARTHUR } from "@/lib/bank/tipos";

const ENTIDADES = [
  { id: ENTIDADE_FAMILIA, nome: "Família Andrade Muller" },
  { id: ENTIDADE_ARTHUR, nome: "Carteira Arthur" },
];

export default function NovaConta() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 font-serif text-2xl font-medium text-text-primary">Nova conta</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Cadastre a conta com o saldo inicial de hoje — os lançamentos futuros somam/subtraem a partir daqui.
      </p>
      <Card>
        <form action={criarConta} className="flex flex-col gap-4">
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
            Nome
            <input
              name="nome"
              type="text"
              required
              placeholder="Nubank Família, Itaú Corrente…"
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Tipo
            <select
              name="tipo"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            >
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="investimento">Investimento</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Saldo inicial
            <input
              name="saldo_inicial"
              type="number"
              step="0.01"
              defaultValue="0"
              required
              className="card-borda bg-surface-2 px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-card bg-text-primary px-4 py-2 text-sm font-medium text-surface-2"
          >
            Salvar conta
          </button>
        </form>
      </Card>
    </div>
  );
}
