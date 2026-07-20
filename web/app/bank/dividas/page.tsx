import Link from "next/link";

export const metadata = { title: "Dívidas" };

// Stub da Fase 0 — vira o módulo completo (parcelas individuais, timeline,
// adiantamento com economia de juros) na Fase 5.
export default function PaginaDividas() {
  return (
    <div className="card-bank p-6">
      <h1 className="text-lg font-semibold">Dívidas</h1>
      <p className="mt-2 text-sm text-text-secondary">
        O módulo de dívidas com parcelas individuais e plano de quitação chega
        em breve. Por enquanto dá pra{" "}
        <Link href="/bank/dividas/nova" className="text-bank-primaria underline">
          cadastrar uma dívida
        </Link>{" "}
        e acompanhar o progresso na{" "}
        <Link href="/bank" className="text-bank-primaria underline">
          página inicial
        </Link>
        .
      </p>
    </div>
  );
}
