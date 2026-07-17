"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/(entrada)/entrada.module.css";

// Encerra a sessão Supabase e volta para a tela de entrada.
export function BotaoSair() {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <button onClick={sair} className={styles.signout} type="button">
      Sair
    </button>
  );
}
