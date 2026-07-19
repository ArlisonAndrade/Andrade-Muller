"use client";

import Image from "next/image";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";

// Casca dos módulos internos do FM. No desktop (md+) a sidebar fica fixa à
// esquerda como sempre; no mobile ela vira um drawer off-canvas aberto por
// um botão hambúrguer, com backdrop. Sem isto a sidebar de 240px comia ~64%
// da tela do celular.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Backdrop escuro só no mobile quando o drawer está aberto */}
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar: estática no desktop, off-canvas no mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          menuAberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setMenuAberto(false)} />
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior só no mobile com o hambúrguer */}
        <div className="flex items-center gap-3 border-b border-divider bg-card px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-divider text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <Image src="/logo-fm.png" alt="" width={28} height={28} className="mix-blend-multiply" />
          <span className="font-display text-base font-semibold text-marinho">FM Gestão</span>
        </div>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
