import Image from "next/image";
import Link from "next/link";
import { BotaoSair } from "@/components/entrada/botao-sair";
import styles from "../entrada.module.css";

// Tela 2 (hub): mesmo fundo da capa, brasão menor no canto como marca-d'água
// da família + ambientes do ecossistema. FM Gestão em / e Bank em /bank —
// mesmo app, mesmo login (não há mais domínio/SSO separado).
const ATALHOS = [
  { href: "/bank/lancar", icone: "＋", nome: "Lançar gasto", onde: "Bank" },
  { href: "/bank/semanas", icone: "🗓", nome: "Semana", onde: "Bank" },
  { href: "/bank/lancamentos", icone: "☰", nome: "Extrato", onde: "Bank" },
  { href: "/reunioes", icone: "💬", nome: "Reuniões", onde: "FM Gestão" },
];

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
        {/* FM Gestão e Estratégica — ativo. Navegação interna, o middleware
            não devolve pro hub (ver entrouDeFora em lib/supabase/middleware.ts). */}
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

      {/* Atalhos do dia a dia no celular (no Android também aparecem ao
          segurar o ícone do app — ver app/manifest.ts). Só em tela estreita. */}
      <nav className={styles.atalhos} aria-label="Atalhos rápidos">
        <p className={styles.atalhosTitulo}>Atalhos</p>
        <div className={styles.atalhosGrade}>
          {ATALHOS.map((a) => (
            <Link key={a.href} href={a.href} className={styles.atalho}>
              <span className={styles.atalhoIcone} aria-hidden>
                {a.icone}
              </span>
              <span className={styles.atalhoNome}>{a.nome}</span>
              <span className={styles.atalhoOnde}>{a.onde}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
