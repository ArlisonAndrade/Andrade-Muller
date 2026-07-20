import Link from "next/link";
import { Card } from "@/components/bank/ui/card";
import { moedaBRL } from "@/lib/bank/formato";
import type { PosicaoAtivo } from "@/lib/bank/tipos";

export function InvestimentosB3({
  posicoes,
  cotacoes,
}: {
  posicoes: PosicaoAtivo[];
  cotacoes: Map<string, number>;
}) {
  const ativas = posicoes.filter((p) => Number(p.quantidade_atual) > 0);

  return (
    <Card title="Investimentos B3">
      {ativas.length === 0 ? (
        <p className="text-sm text-text-faint">
          Nenhuma posição em carteira —{" "}
          <Link href="/bank/investimentos/novo" className="text-text-accent underline">
            lançar a primeira
          </Link>
          .
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-[0.5px] border-border text-left text-xs uppercase tracking-wide text-text-faint">
              <th className="py-2 pr-3 font-medium">Ativo</th>
              <th className="py-2 pr-3 text-right font-medium">Quantidade</th>
              <th className="py-2 pr-3 text-right font-medium">Preço médio</th>
              <th className="py-2 text-right font-medium">Posição atual</th>
            </tr>
          </thead>
          <tbody>
            {ativas.map((p) => {
              const precoAtual = cotacoes.get(p.ativo_id) ?? Number(p.preco_medio) ?? 0;
              const posicaoAtual = Number(p.quantidade_atual) * precoAtual;
              return (
                <tr key={p.ativo_id} className="border-b-[0.5px] border-border/60 last:border-0">
                  <td className="py-2 pr-3 text-text-primary">
                    {p.ticker}
                    <span className="ml-1 text-xs text-text-faint">{p.tipo}</span>
                  </td>
                  <td className="py-2 pr-3 text-right text-text-secondary">
                    {Number(p.quantidade_atual).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 pr-3 text-right text-text-secondary">
                    {moedaBRL(Number(p.preco_medio ?? 0))}
                  </td>
                  <td className="py-2 text-right font-medium text-text-primary">
                    {moedaBRL(posicaoAtual)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Link href="/bank/investimentos/novo" className="mt-3 inline-block text-xs text-text-accent underline">
        + Novo investimento
      </Link>
    </Card>
  );
}
