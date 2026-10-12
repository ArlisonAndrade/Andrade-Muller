import { redirect } from "next/navigation";

// O hub virou a raiz do portal (decisão do Arlison, 12/out/2026): abrir o site
// sempre cai na escolha de ambiente, sem depender de adivinhar se a navegação
// veio de fora. `/hub` fica de pé porque o app já instalado no celular guardou
// esse endereço como `start_url` e os links antigos continuam por aí.
export default function HubAntigo() {
  redirect("/");
}
