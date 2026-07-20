import { criarDivida } from "@/lib/bank/acoes/dividas";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";

export const metadata = { title: "Nova dívida" };

const CAMPO =
  "rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-faint";

// Cadastro de dívida: com taxa + nº de parcelas + 1º vencimento, o
// cronograma Price completo é gerado sozinho (e cada parcela pode ser
// ajustada depois na tela da dívida pra bater com a tabela do contrato).
export default function NovaDivida() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-lg font-semibold">Nova dívida</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Informe o saldo devedor atual, a taxa e as parcelas restantes — o plano
        completo de pagamento é gerado na hora. Exemplo (contrato Santander):
        saldo devedor de hoje, 1,042% a.m., parcelas até 06/2027.
      </p>
      <form action={criarDivida} className="card-bank flex flex-col gap-4 p-5">
        <input type="hidden" name="entidade_id" value={ENTIDADE_FAMILIA} />

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Descrição
          <input name="descricao" type="text" required placeholder="Empréstimo Santander" className={CAMPO} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Saldo devedor atual (R$)
          <input name="saldo_devedor" type="number" step="0.01" min="0.01" required className={CAMPO} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Taxa de juros (% a.m.)
            <input name="taxa_juros_mensal" type="number" step="0.0001" min="0" placeholder="1,042" className={CAMPO} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Parcelas restantes
            <input name="parcelas_total" type="number" min="1" max="480" placeholder="18" className={CAMPO} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Vencimento da próxima parcela
          <input name="primeiro_vencimento" type="date" className={CAMPO} />
        </label>

        <p className="text-xs text-text-faint">
          Sem taxa/parcelas, a dívida entra no modo simples (só saldo e
          amortizações livres). Com os três campos, você ganha o cronograma
          parcela a parcela, o adiantamento com economia de juros e o plano
          anual.
        </p>

        <button
          type="submit"
          className="mt-1 rounded-[10px] bg-bank-primaria px-4 py-2.5 text-sm font-medium text-white"
        >
          Criar dívida e gerar plano
        </button>
      </form>
    </div>
  );
}
