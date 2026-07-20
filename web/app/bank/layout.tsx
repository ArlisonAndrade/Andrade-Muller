import type { Metadata } from "next";
import { Nav } from "@/components/bank/ui/nav";
import { NavMobile } from "@/components/bank/ui/nav-mobile";

// Título específico do módulo Bank (o portal em si usa "Portal Andrade
// Muller" — ver web/app/layout.tsx).
export const metadata: Metadata = {
  title: "Andrade Muller Bank",
};

// Layout da seção Bank (/bank). O visual novo (fundo cinza-azulado, cards
// brancos com sombra suave) fica ESCOPADO neste wrapper — as fontes/tokens
// vêm do root layout e do globals.css, mas o fundo é aplicado só aqui, pra
// não vazar sobre o parchment do FM Gestão. O pb-24 no mobile reserva o
// espaço da barra de navegação inferior fixa (NavMobile).
export default function BankLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-surface-2 font-sans text-text-primary numeros-tabulares">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-10">
        {children}
      </main>
      <NavMobile />
    </div>
  );
}
