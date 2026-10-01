import { redirect } from "next/navigation";

// Lançamento manual saiu (decisão do Arlison, 01/out/2026): NFS-e entra pelo "Subir NFS-e" (PDF original).
// A rota só redireciona, pra link antigo não cair num 404.
export default function Pagina() {
  redirect("/financeiro/notas");
}
