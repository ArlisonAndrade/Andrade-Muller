import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Jogo do Arthur: página estática em public/jogo/ (gerada por
  // jogo-arthur/publicar_no_portal.py). O rewrite só deixa o endereço curto;
  // o proxy roda antes e exige login como em qualquer outra rota.
  async rewrites() {
    return [{ source: "/jogo", destination: "/jogo/index.html" }];
  },
};

export default nextConfig;
