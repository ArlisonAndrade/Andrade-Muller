import { Sidebar } from "@/components/sidebar";

// Layout dos módulos internos (com sidebar). A capa/login e o hub ficam no
// grupo (entrada), sem sidebar.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
