import { redirect } from "next/navigation";

// O lançamento manual saiu (decisão do Arlison, 01/out/2026): gasto da
// família entra pelo agente do Telegram. A rota só redireciona, pra atalho
// antigo salvo no celular não cair num 404.
export default function PaginaLancar() {
  redirect("/bank");
}
