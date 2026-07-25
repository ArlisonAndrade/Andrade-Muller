"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { moedaBRL } from "@/lib/bank/formato";
import { IconEye, IconEyeOff } from "@/components/bank/ui/icones";

const CHAVE_LOCALSTORAGE = "bank_ocultar_valores";
const MASCARA = "R$ ••••••";

const CtxPrivacidade = createContext<{ oculto: boolean; alternar: () => void }>({
  oculto: false,
  alternar: () => {},
});

// Alterna se os valores em R$ ficam mascarados na tela — o resto (nomes,
// categorias, %) continua visível. Preferência fica salva no aparelho.
export function ProvedorPrivacidade({ children }: { children: ReactNode }) {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(CHAVE_LOCALSTORAGE) === "1") setOculto(true);
  }, []);

  function alternar() {
    setOculto((v) => {
      const novo = !v;
      window.localStorage.setItem(CHAVE_LOCALSTORAGE, novo ? "1" : "0");
      return novo;
    });
  }

  return <CtxPrivacidade.Provider value={{ oculto, alternar }}>{children}</CtxPrivacidade.Provider>;
}

export function usePrivacidade() {
  return useContext(CtxPrivacidade);
}

export function BotaoPrivacidade() {
  const { oculto, alternar } = usePrivacidade();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oculto ? "Mostrar valores em R$" : "Ocultar valores em R$"}
      title={oculto ? "Mostrar valores" : "Ocultar valores"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary"
    >
      {oculto ? <IconEyeOff size={16} stroke={1.8} /> : <IconEye size={16} stroke={1.8} />}
    </button>
  );
}

// Substitui todo `moedaBRL(x)` exibido na tela — mostra a máscara quando o
// modo privado está ligado, mantendo o resto da linha (nome, categoria, %)
// intocado.
export function ValorMoeda({ valor }: { valor: number }) {
  const { oculto } = usePrivacidade();
  return <>{oculto ? MASCARA : moedaBRL(valor)}</>;
}
