import Image from "next/image";
import { BotaoGoogle } from "@/components/entrada/botao-google";
import styles from "../entrada.module.css";

const ERROS: Record<string, string> = {
  sem_acesso:
    "Esse e-mail não está liberado para acessar o sistema. Fale com o administrador.",
  falha: "Não foi possível concluir o login. Tente novamente.",
};

// Tela 1 (capa = login): brasão + entrar com Google.
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className={styles.portal}>
      <div className={styles.crestWrap}>
        <div className={styles.glow} />
        <Image
          src="/crest-familia.webp"
          alt="Brasão da família"
          width={210}
          height={210}
          priority
          className={styles.crestImg}
        />
      </div>

      <p className={styles.eyebrow}>Acesso restrito · área da família</p>

      <BotaoGoogle next="/hub" />

      {erro ? (
        <p className={styles.erro}>{ERROS[erro] ?? "Ocorreu um erro no login."}</p>
      ) : (
        <p className={styles.fineprint}>Login com conta Google autorizada</p>
      )}
    </div>
  );
}
