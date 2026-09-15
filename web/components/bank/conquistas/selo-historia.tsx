import type { SeloHistoria } from "@/lib/bank/conquistas-visual";

// Desenhos dos selos da história. Não existe emoji de poço nem de semáforo
// aceso, e esses três marcos merecem mais que um emoji: são desenhados aqui,
// em SVG, e escalam da vitrine à TV.
//
// - Fundo do Poço (08/05/2024): preto, com um poço de pedra.
// - Negociação com o BB (22/06/2026): verde, com o semáforo aceso no verde.
// - Fim do Santander: corrente partida. Enquanto em construção, cinza com o
//   arco das parcelas pagas em volta.

export function SeloHistoriaDesenho({
  selo,
  tamanho = 96,
  bloqueado = false,
  progresso = 0,
}: {
  selo: SeloHistoria;
  tamanho?: number;
  bloqueado?: boolean;
  progresso?: number; // 0–100, só no Fim do Santander em construção
}) {
  const r = 46;
  const circunferencia = 2 * Math.PI * r;

  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-hidden className="shrink-0">
      <defs>
        <radialGradient id="selo-poco" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
        <linearGradient id="selo-bb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="selo-santander" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <filter id="selo-brilho" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {selo === "fundo_do_poco" && (
        <g>
          <circle cx="50" cy="50" r="48" fill="url(#selo-poco)" stroke="#52525b" strokeWidth="2" />
          {/* telhado e postes */}
          <path d="M28 34 L50 22 L72 34" fill="none" stroke="#d4d4d8" strokeWidth="3" strokeLinejoin="round" />
          <line x1="33" y1="32" x2="33" y2="58" stroke="#a1a1aa" strokeWidth="3" />
          <line x1="67" y1="32" x2="67" y2="58" stroke="#a1a1aa" strokeWidth="3" />
          {/* manivela, corda e balde */}
          <line x1="33" y1="40" x2="67" y2="40" stroke="#a1a1aa" strokeWidth="2" />
          <line x1="50" y1="40" x2="50" y2="50" stroke="#e4e4e7" strokeWidth="1.2" />
          <path d="M45 50 h10 l-1.5 7 h-7 z" fill="#71717a" />
          {/* boca do poço: pedras */}
          <ellipse cx="50" cy="66" rx="22" ry="6" fill="#000" stroke="#a1a1aa" strokeWidth="2" />
          <path d="M28 66 v10 a22 6 0 0 0 44 0 v-10" fill="#3f3f46" stroke="#a1a1aa" strokeWidth="2" />
          <path d="M36 71 v6 M46 72.5 v6 M56 72.5 v6 M65 71 v6" stroke="#18181b" strokeWidth="1.5" />
        </g>
      )}

      {selo === "negociacao_bb" && (
        <g>
          <circle cx="50" cy="50" r="48" fill="url(#selo-bb)" stroke="#bbf7d0" strokeWidth="2" />
          <rect x="38" y="18" width="24" height="60" rx="8" fill="#111827" stroke="#374151" strokeWidth="2" />
          <circle cx="50" cy="31" r="6.5" fill="#7f1d1d" opacity="0.55" />
          <circle cx="50" cy="48" r="6.5" fill="#78350f" opacity="0.55" />
          <circle cx="50" cy="65" r="7" fill="#4ade80" filter="url(#selo-brilho)" />
          <line x1="50" y1="78" x2="50" y2="86" stroke="#111827" strokeWidth="4" />
        </g>
      )}

      {selo === "fim_santander" && (
        <g>
          <circle
            cx="50"
            cy="50"
            r="48"
            fill={bloqueado ? "#eef1f4" : "url(#selo-santander)"}
            stroke={bloqueado ? "#d4d9e1" : "#fde68a"}
            strokeWidth="2"
          />
          {bloqueado && (
            <>
              <circle cx="50" cy="50" r={r} fill="none" stroke="#dde3ea" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#16a34a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(circunferencia * Math.max(0, Math.min(100, progresso))) / 100} ${circunferencia}`}
                transform="rotate(-90 50 50)"
              />
            </>
          )}
          {bloqueado ? (
            // em construção: a corrente ainda inteira, elos entrelaçados
            <g fill="none" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round">
              <rect x="20" y="40" width="34" height="20" rx="10" transform="rotate(-20 37 50)" />
              <rect x="46" y="40" width="34" height="20" rx="10" transform="rotate(-20 63 50)" />
            </g>
          ) : (
            // quitado: os elos separados, o da direita aberto, faíscas no meio
            <g>
              <g fill="none" stroke="#7c2d12" strokeWidth="6" strokeLinecap="round">
                <rect x="12" y="44" width="30" height="20" rx="10" transform="rotate(-30 27 54)" />
                <path d="M62 36 h10 a10 10 0 0 1 0 20 h-6" transform="rotate(-30 70 46)" />
                <path d="M60 52 a10 10 0 0 1 2 -14" transform="rotate(-30 70 46)" />
              </g>
              <g stroke="#fff7ed" strokeWidth="2.5" strokeLinecap="round">
                <path d="M50 38 l0 -9" />
                <path d="M44 42 l-6 -6" />
                <path d="M56 42 l6 -6" />
                <path d="M50 62 l0 8" />
              </g>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
