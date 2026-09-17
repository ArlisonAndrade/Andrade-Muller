import { redirect } from "next/navigation";

// O roteiro da reunião trimestral virou o Modo TV único em /bank/tv
// (17/set/2026). Mantido só pra links antigos não quebrarem.
export default async function RedirecionarReuniao({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  redirect(t ? `/bank/tv?t=${encodeURIComponent(t)}` : "/bank/tv");
}
