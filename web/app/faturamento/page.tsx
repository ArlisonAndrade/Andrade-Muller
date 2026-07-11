import { redirect } from "next/navigation";

// A aba Faturamento virou Financeiro (10/jul/2026)
export default function Redireciona() {
  redirect("/financeiro");
}
