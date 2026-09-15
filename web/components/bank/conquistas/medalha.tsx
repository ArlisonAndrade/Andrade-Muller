import { COR_NIVEL, type Nivel, type SeloHistoria } from "@/lib/bank/conquistas-visual";
import { SeloHistoriaDesenho } from "@/components/bank/conquistas/selo-historia";

// A medalha em si: disco com o metal do nível e o emoji no meio. Bloqueada é
// cinza e desbotada — dá pra ver o que existe sem parecer que já foi ganho.
// Selo da história usa o desenho próprio no lugar do metal.
// Sem estado, então serve no servidor, na vitrine, na comemoração e na TV.
export function Medalha({
  emoji,
  nivel,
  bloqueada = false,
  tamanho = 56,
  selo,
  progresso,
}: {
  emoji: string;
  nivel: Nivel;
  bloqueada?: boolean;
  tamanho?: number;
  selo?: SeloHistoria;
  progresso?: number;
}) {
  if (selo) {
    return <SeloHistoriaDesenho selo={selo} tamanho={tamanho} bloqueado={bloqueada} progresso={progresso} />;
  }
  const cor = COR_NIVEL[nivel];
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: tamanho,
        height: tamanho,
        background: bloqueada ? "#e5e9ef" : cor.fundo,
        boxShadow: bloqueada
          ? "inset 0 0 0 2px #d4d9e1"
          : `inset 0 0 0 3px rgba(255,255,255,0.55), 0 0 0 2px ${cor.borda}, 0 4px 12px rgba(0,0,0,0.15)`,
      }}
      aria-hidden
    >
      <span
        style={{
          fontSize: tamanho * 0.48,
          lineHeight: 1,
          filter: bloqueada ? "grayscale(1) opacity(0.45)" : "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
        }}
      >
        {emoji}
      </span>
    </span>
  );
}
