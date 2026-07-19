import Image from "next/image";
import Link from "next/link";

const ITENS_MENU = [
  { rotulo: "Início", href: "/bank" },
  { rotulo: "Lançamento", href: "/bank/lancamento/novo" },
  { rotulo: "Transferir", href: "/bank/transferir-pro-labore" },
  { rotulo: "Contas", href: "/bank/contas/nova" },
  { rotulo: "Dívidas", href: "/bank/dividas/nova" },
];

export function Nav() {
  return (
    <header className="border-b-[0.5px] border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/bank" className="flex items-center">
          <Image
            src="/logo-bank.svg"
            alt="Andrade Muller Bank"
            width={160}
            height={50}
            priority
          />
        </Link>

        <nav className="flex items-center gap-6">
          {ITENS_MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {item.rotulo}
            </Link>
          ))}
          <Link
            href="/hub"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Trocar ambiente
          </Link>
        </nav>

        <div className="flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] border-border text-xs font-medium text-text-secondary">
          AF
        </div>
      </div>
    </header>
  );
}
