import Link from "next/link";

export const metadata = { title: "Investimentos" };

// Stub da Fase 0 — vira o painel completo (classes, metas de alocação,
// evolução, proventos) na Fase 2.
export default function PaginaInvestimentos() {
  return (
    <div className="card-bank p-6">
      <h1 className="text-lg font-semibold">Investimentos</h1>
      <p className="mt-2 text-sm text-text-secondary">
        O painel de investimentos (classes, metas de alocação, evolução e
        proventos) chega em breve. Suas posições continuam visíveis na{" "}
        <Link href="/bank" className="text-bank-primaria underline">
          página inicial
        </Link>
        , e você pode{" "}
        <Link href="/bank/investimentos/novo" className="text-bank-primaria underline">
          registrar uma compra
        </Link>
        .
      </p>
    </div>
  );
}
