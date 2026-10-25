import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Balanço trimestral em PDF: o react-pdf roda no Node como está (sem passar
  // pelo bundler), e as fontes e o brasão que ele lê do disco precisam ir
  // junto com a função na Vercel.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/api/bank/balanco": ["./lib/bank/balanco/fontes/**", "./lib/bank/balanco/brasao.png"],
    "/api/bank/agente/balanco": ["./lib/bank/balanco/fontes/**", "./lib/bank/balanco/brasao.png"],
    "/api/bank/agente/decisao": ["./lib/bank/balanco/fontes/**", "./lib/bank/balanco/brasao.png"],
    "/api/bank/agente/decisoes": ["./lib/bank/balanco/fontes/**", "./lib/bank/balanco/brasao.png"],
  },
  // Jogo do Arthur: página estática em public/jogo/ (gerada por
  // jogo-arthur/publicar_no_portal.py). O rewrite só deixa o endereço curto;
  // o proxy roda antes e exige login como em qualquer outra rota.
  async rewrites() {
    return [{ source: "/jogo", destination: "/jogo/index.html" }];
  },
};

export default nextConfig;
