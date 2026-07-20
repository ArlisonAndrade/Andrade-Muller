"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconReceipt,
  IconPlus,
  IconChartPie,
  IconCoins,
} from "@/components/bank/ui/icones";

const ITENS = [
  { rotulo: "Início", href: "/bank", Icone: IconHome },
  { rotulo: "Extrato", href: "/bank/lancamentos", Icone: IconReceipt },
  { rotulo: "Investir", href: "/bank/investimentos", Icone: IconChartPie },
  { rotulo: "Dívidas", href: "/bank/dividas", Icone: IconCoins },
];

function itemAtivo(pathname: string, href: string) {
  if (href === "/bank") return pathname === "/bank";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Barra inferior fixa do mobile: 4 atalhos + botão central grande de lançar.
// Só aparece abaixo do breakpoint md; o layout reserva o espaço com pb.
export function NavMobile() {
  const pathname = usePathname();
  const [esquerda, direita] = [ITENS.slice(0, 2), ITENS.slice(2)];

  const renderItem = ({ rotulo, href, Icone }: (typeof ITENS)[number]) => (
    <Link
      key={href}
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
        itemAtivo(pathname, href) ? "font-medium text-bank-primaria" : "text-text-secondary"
      }`}
    >
      <Icone size={22} stroke={1.7} />
      {rotulo}
    </Link>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-1 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center">
        {esquerda.map(renderItem)}
        <Link
          href="/bank/lancar"
          aria-label="Novo lançamento"
          className="-mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bank-primaria text-white shadow-lg"
        >
          <IconPlus size={28} stroke={2.2} />
        </Link>
        {direita.map(renderItem)}
      </div>
    </nav>
  );
}
