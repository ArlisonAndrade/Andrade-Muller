// Service worker do Portal instalado como app (24/set/2026, mesmo desenho do
// painel do Grupo Piotto).
//
// NÃO GUARDA NADA EM CACHE, de propósito: página em cache seguraria a versão
// velha depois de cada deploy — a pessoa abriria o app e veria o painel de
// ontem, sem erro nenhum que denunciasse. Todo dado vem do Supabase: offline
// não há o que mostrar além de "sem conexão".
//
// Só faz uma coisa: quando a NAVEGAÇÃO falha (sem rede), devolve uma página de
// aviso em vez da tela de erro do navegador, que dentro do app instalado não
// tem nem barra de endereço pra pessoa entender onde está.

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

var SEM_CONEXAO = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<meta name="theme-color" content="#17110b"><title>Sem conexão</title>' +
  '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
  'background:radial-gradient(ellipse at 50% 40%,#33230f 0%,#241a10 45%,#17110b 100%);color:#efe6d3;' +
  'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:24px;box-sizing:border-box}' +
  '.c{max-width:320px}img{width:96px;height:96px;border-radius:22px;margin-bottom:20px}' +
  'h1{font-size:20px;margin:0 0 8px;color:#e3c476}p{font-size:14px;color:rgba(239,230,211,.7);margin:0 0 20px;line-height:1.5}' +
  'button{font:inherit;font-size:14px;font-weight:600;background:transparent;color:#efe6d3;border:1px solid #c9a24b;border-radius:6px;padding:12px 20px}</style>' +
  '</head><body><div class="c"><h1>Sem conexão</h1>' +
  '<p>O Portal mostra os números direto do banco, então precisa de internet. Confira o Wi-Fi ou os dados móveis.</p>' +
  '<button onclick="location.reload()">Tentar de novo</button></div></body></html>';

self.addEventListener("fetch", function (e) {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response(SEM_CONEXAO, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }));
});
