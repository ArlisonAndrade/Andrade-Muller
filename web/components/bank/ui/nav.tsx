"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconPlus } from "@/components/bank/ui/icones";

const ITENS_MENU = [
  { rotulo: "Início", href: "/bank" },
  { rotulo: "Extrato", href: "/bank/lancamentos" },
  { rotulo: "Investimentos", href: "/bank/investimentos" },
  { rotulo: "Dívidas", href: "/bank/dividas" },
  { rotulo: "Plano", href: "/bank/plano" },
  { rotulo: "Arthur", href: "/bank/arthur" },
  { rotulo: "Trocar ambiente", href: "/hub" },
];

function itemAtivo(pathname: string, href: string) {
  if (href === "/bank") return pathname === "/bank";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface-1">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/bank" className="flex items-center" onClick={() => setAberto(false)}>
          <Image
            src="/logo-bank.svg"
            alt="Andrade Muller Bank"
            width={140}
            height={44}
            priority
            className="w-32 sm:w-36"
          />
        </Link>

        {/* Links inline no desktop */}
        <nav className="hidden items-center gap-5 md:flex">
          {ITENS_MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${
                itemAtivo(pathname, item.href)
                  ? "font-medium text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {item.rotulo}
            </Link>
          ))}
          <Link
            href="/bank/lancar"
            className="flex items-center gap-1 rounded-full bg-bank-primaria px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <IconPlus size={16} stroke={2} />
            Lançar
          </Link>
        </nav>

        {/* Botão hambúrguer no mobile */}
        <button
          type="button"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-text-primary md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            {aberto ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Menu mobile expandido */}
      {aberto && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-2 md:hidden">
          {ITENS_MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className={`rounded-[8px] px-2 py-2.5 text-sm transition-colors ${
                itemAtivo(pathname, item.href)
                  ? "bg-surface-3 font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              }`}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
