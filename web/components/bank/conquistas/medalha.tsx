import { COR_NIVEL, type Nivel } from "@/lib/bank/conquistas-visual";

// A medalha em si: disco com o metal do nível e o emoji no meio. Bloqueada é
// cinza e desbotada — dá pra ver o que existe sem parecer que já foi ganho.
// Sem estado, então serve no servidor, na vitrine, na comemoração e na TV.
export function Medalha({
  emoji,
  nivel,
  bloqueada = false,
  tamanho = 56,
}: {
  emoji: string;
  nivel: Nivel;
  bloqueada?: boolean;
  tamanho?: number;
}) {
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
