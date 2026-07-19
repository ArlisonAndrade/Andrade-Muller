import { AppShell } from "@/components/app-shell";

// Layout dos módulos internos (com sidebar). A capa/login e o hub ficam no
// grupo (entrada), sem sidebar. O AppShell cuida do responsivo: sidebar fixa
// no desktop, drawer com hambúrguer no mobile.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
