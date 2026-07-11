"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      {children}
    </svg>
  );
}

const modulos = [
  {
    href: "/",
    label: "Dashboard",
    icone: (
      <Icone>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </Icone>
    ),
  },
  {
    href: "/crm",
    label: "CRM & Funil",
    icone: (
      <Icone>
        <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
      </Icone>
    ),
  },
  {
    href: "/reunioes",
    label: "Reuniões",
    icone: (
      <Icone>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </Icone>
    ),
  },
  {
    href: "/tarefas",
    label: "Tarefas",
    icone: (
      <Icone>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12l3 3 5-6" />
      </Icone>
    ),
  },
  {
    href: "/projetos",
    label: "Projetos",
    icone: (
      <Icone>
        <path d="M12 3l9 5-9 5-9-5 9-5z" />
        <path d="M3 13l9 5 9-5" />
      </Icone>
    ),
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icone: (
      <Icone>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6" />
      </Icone>
    ),
  },
  {
    href: "/contratos",
    label: "Contratos",
    icone: (
      <Icone>
        <path d="M14 3H6v18h12V7l-4-4z" />
        <path d="M14 3v4h4M9 13h6M9 17h4" />
      </Icone>
    ),
  },
  {
    href: "/metas",
    label: "Metas & OKRs",
    icone: (
      <Icone>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </Icone>
    ),
  },
  {
    href: "/saude",
    label: "Saúde Operacional",
    icone: (
      <Icone>
        <path d="M3 12h4l3-7 4 14 3-7h4" />
      </Icone>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-divider bg-card px-4 py-6">
      <div className="mb-8 flex items-center gap-3 px-2">
        {/* mix-blend-multiply funde o fundo branco da logo com o creme do card */}
        <Image
          src="/logo-fm.png"
          alt="FM Gestão e Estratégica"
          width={56}
          height={56}
          className="mix-blend-multiply"
          priority
        />
        <div>
          <span className="font-display text-lg font-semibold leading-tight text-marinho">
            FM Gestão
          </span>
          <p className="text-xs text-ink-faint">e Estratégica</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {modulos.map(({ href, label, icone }) => {
          const ativo =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                ativo
                  ? "bg-parchment font-medium text-marinho"
                  : "text-ink-soft hover:bg-parchment/60 hover:text-ink"
              }`}
            >
              {icone}
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
