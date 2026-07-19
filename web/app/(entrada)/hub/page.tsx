import Image from "next/image";
import Link from "next/link";
import { BotaoSair } from "@/components/entrada/botao-sair";
import styles from "../entrada.module.css";

// Tela 2 (hub): mesmo fundo da capa, brasão menor no canto como marca-d'água
// da família + ambientes do ecossistema. FM Gestão em / e Bank em /bank —
// mesmo app, mesmo login (não há mais domínio/SSO separado).
export default function PaginaHub() {
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
      <p className={styles.hubSub}>Ecossistema Andrade Muller</p>

      <div className={styles.hubCards}>
        {/* FM Gestão e Estratégica — ativo */}
        <Link href="/" className={styles.envCard}>
          <Image src="/logo-fm.png" alt="FM Gestão" width={72} height={72} className={styles.fmLogo} />
          <span className={styles.envLabel}>FM Gestão</span>
          <span className={styles.envNote}>CRM, reuniões, financeiro e metas</span>
        </Link>

        {/* Andrade Muller Bank — seção /bank do mesmo app, mesmo backend Supabase */}
        <Link href="/bank" className={styles.envCard}>
          <Image src="/logo-bank.svg" alt="Andrade Muller Bank" width={150} height={47} className={styles.bankLogo} />
          <span className={styles.envLabel}>Andrade Muller Bank</span>
          <span className={styles.envNote}>Patrimônio, orçamento e investimentos</span>
        </Link>
      </div>
    </div>
  );
}
