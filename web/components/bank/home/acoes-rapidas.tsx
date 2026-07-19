import Link from "next/link";
import { IconPlus, IconArrowsExchange, IconUpload } from "@/components/bank/ui/icones";

const ACOES = [
  { href: "/bank/lancamento/novo", rotulo: "Lançamento", Icone: IconPlus },
  { href: "/bank/transferir-pro-labore", rotulo: "Transferir pró-labore", Icone: IconArrowsExchange },
  { href: "/bank/importar-fatura", rotulo: "Importar fatura", Icone: IconUpload },
];

export function AcoesRapidas() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {ACOES.map(({ href, rotulo, Icone }) => (
        <Link
          key={href}
          href={href}
          className="card-borda flex flex-col items-center gap-2 bg-surface-2 px-4 py-5 text-center transition-colors hover:bg-surface-1"
        >
          <Icone size={20} stroke={1.5} className="text-text-primary" />
          <span className="text-sm font-medium text-text-primary">{rotulo}</span>
        </Link>
      ))}
    </div>
  );
}
