"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const ITENS_MENU = [
  { rotulo: "Início", href: "/bank" },
  { rotulo: "Lançamento", href: "/bank/lancamento/novo" },
  { rotulo: "Transferir", href: "/bank/transferir-pro-labore" },
  { rotulo: "Contas", href: "/bank/contas/nova" },
  { rotulo: "Dívidas", href: "/bank/dividas/nova" },
  { rotulo: "Trocar ambiente", href: "/hub" },
];

export function Nav() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="border-b-[0.5px] border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/bank" className="flex items-center" onClick={() => setAberto(false)}>
          <Image
            src="/logo-bank.svg"
            alt="Andrade Muller Bank"
            width={140}
            height={44}
            priority
            className="w-32 sm:w-40"
          />
        </Link>

        {/* Links inline no desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {ITENS_MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>

        {/* Botão hambúrguer no mobile */}
        <button
          type="button"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] border-[0.5px] border-border text-text-primary md:hidden"
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
        <nav className="flex flex-col gap-1 border-t-[0.5px] border-border px-4 py-2 md:hidden">
          {ITENS_MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className="rounded-[8px] px-2 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-1 hover:text-text-primary"
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
