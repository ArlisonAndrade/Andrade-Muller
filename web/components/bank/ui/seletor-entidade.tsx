import Link from "next/link";
import type { VisaoEntidade } from "@/lib/bank/tipos";

const OPCOES: { valor: VisaoEntidade; rotulo: string }[] = [
  { valor: "consolidado", rotulo: "Consolidado" },
  { valor: "familia", rotulo: "Família" },
];

export function SeletorEntidade({ visaoAtual }: { visaoAtual: VisaoEntidade }) {
  return (
    <div className="mb-8 flex w-fit gap-1 rounded-card border-[0.5px] border-border p-1">
      {OPCOES.map((opcao) => {
        const ativo = opcao.valor === visaoAtual;
        return (
          <Link
            key={opcao.valor}
            href={opcao.valor === "consolidado" ? "/bank" : `/bank?visao=${opcao.valor}`}
            className={`rounded-[8px] px-4 py-1.5 text-sm transition-colors ${
              ativo
                ? "bg-text-primary text-surface-2"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {opcao.rotulo}
          </Link>
        );
      })}
    </div>
  );
}
