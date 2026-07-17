import Link from "next/link";
import { IconPlus, IconArrowsExchange, IconUpload } from "@/components/ui/icones";

const ACOES = [
  { href: "/lancamento/novo", rotulo: "Lançamento", Icone: IconPlus },
  { href: "/transferir-pro-labore", rotulo: "Transferir pró-labore", Icone: IconArrowsExchange },
  { href: "/importar-fatura", rotulo: "Importar fatura", Icone: IconUpload },
];

export function AcoesRapidas() {
  return (
    <div className="mb-8 grid grid-cols-3 gap-4">
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
