import { redirect } from "next/navigation";

// Lançamento manual saiu (decisão do Arlison, 01/out/2026): despesa/caixa entra pelo extrato e pelas recorrências.
// A rota só redireciona, pra link antigo não cair num 404.
export default function Pagina() {
  redirect("/financeiro");
}
