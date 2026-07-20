import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { iniciarImportacao } from "@/lib/bank/acoes/importacao";
import { IconUpload } from "@/components/bank/ui/icones";

export const metadata = { title: "Importar fatura" };

const MENSAGENS_ERRO: Record<string, string> = {
  dados: "Preencha cartão, competência e arquivo.",
  vazio: "Não encontrei lançamentos legíveis nesse arquivo — confere se é o CSV da fatura?",
};

// Import de fatura CSV (Nubank, Carrefour ou export genérico com colunas
// de data/descrição/valor). Fluxo: upload → revisão de categorias →
// confirmar (gera transações sem duplicar o que já foi lançado no rápido).
export default async function ImportarFatura({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: cartoes } = await supabase
    .from("cartoes")
    .select("id, nome")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .order("nome");

  const mesAtual = new Date().toISOString().slice(0, 7);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-lg font-semibold">Importar fatura</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Suba o CSV da fatura (Nubank: app → fatura → exportar). As categorias
        são preenchidas pelas suas regras; o que sobrar você revisa antes de
        confirmar. Nada é duplicado com o que você já lançou no dia a dia.
      </p>

      {erro && MENSAGENS_ERRO[erro] && (
        <p className="mb-4 rounded-[10px] bg-bank-negativo-bg px-3 py-2 text-sm text-bank-negativo">
          {MENSAGENS_ERRO[erro]}
        </p>
      )}

      <form action={iniciarImportacao} className="card-bank flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Cartão
          <select
            name="cartao_id"
            required
            className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none"
          >
            {(cartoes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Competência da fatura
          <input
            name="competencia"
            type="month"
            required
            defaultValue={mesAtual}
            className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Arquivo CSV
          <input
            name="arquivo"
            type="file"
            accept=".csv,text/csv"
            required
            className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none file:mr-3 file:rounded-[6px] file:border-0 file:bg-surface-3 file:px-3 file:py-1.5 file:text-xs file:text-text-secondary"
          />
        </label>

        <button
          type="submit"
          className="mt-1 flex items-center justify-center gap-2 rounded-[10px] bg-bank-primaria px-4 py-2.5 text-sm font-medium text-white"
        >
          <IconUpload size={16} stroke={2} /> Ler fatura
        </button>
      </form>
    </div>
  );
}
