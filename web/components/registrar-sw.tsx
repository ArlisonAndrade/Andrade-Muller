"use client";

import { useEffect } from "react";

// Registra o public/sw.js (só a página de "Sem conexão" do app instalado —
// não guarda cache). Em http fora do localhost o navegador recusa, então nem tenta.
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
