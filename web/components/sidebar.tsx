"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modulos = [
  { href: "/", label: "Dashboard" },
  { href: "/crm", label: "CRM & Funil" },
  { href: "/reunioes", label: "Reuniões" },
  { href: "/tarefas", label: "Tarefas" },
  { href: "/faturamento", label: "Faturamento" },
  { href: "/contratos", label: "Contratos" },
  { href: "/metas", label: "Metas & OKRs" },
  { href: "/saude", label: "Saúde Operacional" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-divider bg-card px-4 py-8">
      <div className="mb-10 px-3">
        <span className="font-display text-2xl font-semibold text-marinho">
          FM
        </span>
        <p className="mt-1 text-xs text-ink-faint">Gestão e Estratégica</p>
      </div>
      <nav className="flex flex-col gap-1">
        {modulos.map(({ href, label }) => {
          const ativo =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                ativo
                  ? "bg-parchment font-medium text-marinho"
                  : "text-ink-soft hover:bg-parchment/60 hover:text-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
