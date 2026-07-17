import Image from "next/image";
import Link from "next/link";
import { BotaoSair } from "@/components/entrada/botao-sair";
import styles from "../entrada.module.css";

// Tela 2 (hub): mesmo fundo da capa, brasão menor no canto como marca-d'água
// da família + ambientes do ecossistema. FM Gestão e Andrade&Muller Bank
// já existem (apps Next.js separados, mesmo backend Supabase).
export default function PaginaHub() {
  const urlBank = process.env.NEXT_PUBLIC_BANK_URL;

  return (
    <div className={styles.hub}>
      <div className={styles.hubTopbar}>
        <Image
          src="/crest-familia.webp"
          alt="Brasão da família"
          width={60}
          height={60}
          className={styles.cornerCrest}
        />
        <div className={styles.accountArea}>
          <span className={styles.accountChip}>
            <span className={styles.dot} /> Conta Google conectada
          </span>
          <BotaoSair />
        </div>
      </div>

      <p className={styles.hubTitle}>Escolha um ambiente</p>
      <p className={styles.hubSub}>Ecossistema Andrade&amp;Muller</p>

      <div className={styles.hubCards}>
        {/* FM Gestão e Estratégica — ativo */}
        <Link href="/" className={styles.envCard}>
          <div className={styles.envShield}>
            <Image src="/logo-fm.png" alt="" width={40} height={40} />
          </div>
          <span className={styles.envLabel}>FM Gestão</span>
          <span className={styles.envNote}>CRM, reuniões, financeiro e metas</span>
        </Link>

        {/* Andrade&Muller Bank — app separado (bank/web), mesmo backend Supabase */}
        {urlBank ? (
          <a href={urlBank} className={styles.envCard}>
            <div className={styles.envShield}>A&amp;M</div>
            <span className={styles.envLabel}>Andrade&amp;Muller Bank</span>
            <span className={styles.envNote}>Patrimônio, orçamento e investimentos</span>
          </a>
        ) : (
          <div className={`${styles.envCard} ${styles.envCardMuted}`}>
            <div className={styles.envShield}>A&amp;M</div>
            <span className={styles.envLabel}>Andrade&amp;Muller Bank</span>
            <span className={styles.envNote}>Configure NEXT_PUBLIC_BANK_URL</span>
          </div>
        )}
      </div>
    </div>
  );
}
