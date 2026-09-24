import type { MetadataRoute } from "next";

// Portal instalável na tela inicial do celular (24/set/2026, mesmo caminho do
// painel do Grupo Piotto, sem o passo a passo de instalação). Abre no /hub —
// a escolha de ambiente de sempre. Ícones gerados por
// scripts/gerar_icones_app.py a partir do brasão da tela de entrada.
//
// `shortcuts` = o menu que aparece ao segurar o ícone no Android (o iPhone
// não tem; lá os mesmos atalhos estão no /hub). Só rotas internas: "/" aberto
// de fora cai no hub (ver entrouDeFora em lib/supabase/middleware.ts), então
// o atalho do FM aponta pra uma tela dele.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal Andrade Muller",
    short_name: "Andrade Muller",
    description: "FM Gestão e Andrade Muller Bank — o ecossistema da família.",
    lang: "pt-BR",
    id: "/hub",
    start_url: "/hub",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#17110b",
    theme_color: "#17110b",
    icons: [
      { src: "/app/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lançar gasto", short_name: "Lançar", url: "/bank/lancar", icons: [{ src: "/app/icone-192.png", sizes: "192x192" }] },
      { name: "Semana", short_name: "Semana", url: "/bank/semanas", icons: [{ src: "/app/icone-192.png", sizes: "192x192" }] },
      { name: "Extrato", short_name: "Extrato", url: "/bank/lancamentos", icons: [{ src: "/app/icone-192.png", sizes: "192x192" }] },
      { name: "Reuniões (FM Gestão)", short_name: "Reuniões", url: "/reunioes", icons: [{ src: "/app/icone-192.png", sizes: "192x192" }] },
    ],
  };
}
