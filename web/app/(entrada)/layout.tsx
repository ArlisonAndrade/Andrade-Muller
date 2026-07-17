import { Cinzel, Cormorant_Garamond } from "next/font/google";
import styles from "./entrada.module.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Fundo compartilhado da capa/login e do hub — identidade visual própria do
// portal da família (madeira/dourado, Cinzel + Cormorant Garamond), à parte
// dos tokens do FM Gestão. Sem sidebar — é o grupo de entrada do ecossistema.
export default function EntradaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${cinzel.variable} ${cormorant.variable} ${styles.shell}`}>
      <div className={styles.grain} />
      {children}
    </div>
  );
}
