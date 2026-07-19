import type { Metadata } from "next";
import { Nav } from "@/components/bank/ui/nav";

// Título específico do módulo Bank (o portal em si usa "Portal Andrade
// Muller" — ver web/app/layout.tsx).
export const metadata: Metadata = {
  title: "Andrade Muller Bank",
};

// Layout da seção Bank (/bank). O visual "Avenue" (fundo branco, serifa nos
// números, borda 0.5px) fica ESCOPADO neste wrapper — as fontes/tokens vêm
// do root layout e do globals.css, mas o fundo branco é aplicado só aqui,
// pra não vazar sobre o parchment do FM Gestão.
export default function BankLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-surface-2 font-sans text-text-primary">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
