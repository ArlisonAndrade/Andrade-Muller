import { moedaBRL } from "@/lib/formato";
import type { PosicaoAtivo } from "@/lib/tipos";

export function CarteiraArthur({
  patrimonio,
  posicoes,
}: {
  patrimonio: number;
  posicoes: PosicaoAtivo[];
}) {
  const ativas = posicoes.filter((p) => Number(p.quantidade_atual) > 0);

  return (
    <section className="rounded-card border-[0.5px] border-arthur/30 bg-surface-2 p-6">
      <p className="text-sm font-medium text-arthur">Carteira Arthur</p>
      <p className="mt-2 font-serif text-3xl font-medium text-arthur">
        {moedaBRL(patrimonio)}
      </p>
      {ativas.length === 0 ? (
        <p className="mt-3 text-xs text-text-faint">Sem posições registradas ainda.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {ativas.map((p) => (
            <li key={p.ativo_id} className="flex justify-between text-sm">
              <span className="text-text-secondary">{p.ticker}</span>
              <span className="text-text-primary">
                {Number(p.quantidade_atual).toLocaleString("pt-BR")} un.
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
