import { moedaBRL } from "@/lib/bank/formato";

export type PontoJornada = {
  ano: number;
  investimento: number;
  dividas: number;
  marcoEmoji: string | null;
  marcoTitulo: string | null;
  marcoData: string | null;
};

function moedaCompacta(valor: number) {
  const sinal = valor < 0 ? "-" : "";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${sinal}R$${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `${sinal}R$${Math.round(abs / 1_000)}k`;
  return `${sinal}${moedaBRL(abs)}`;
}

// Gráfico da jornada real: dívida pesando desde 2021, a virada da chave em
// 2024, os primeiros aportes, e a curva projetada até o patrimônio positivo.
// Não é um gráfico neutro de análise — é a prova visual de um período difícil
// que virou plano. Emojis nos marcos são intencionais, não decoração.
export function JornadaPatrimonio({ pontos, anoAtual }: { pontos: PontoJornada[]; anoAtual: number }) {
  if (pontos.length === 0) return null;

  const totais = pontos.map((p) => p.investimento - p.dividas);
  const maxAbs = Math.max(...totais.map((t) => Math.abs(t)), 1);
  const ALTURA_MAX = 92; // px de cada lado da linha zero

  return (
    <div className="overflow-x-auto">
      <div
        className="flex min-w-[720px] items-stretch gap-1 rounded-[10px] p-4"
        style={{
          background:
            "linear-gradient(90deg, var(--color-bank-negativo-bg) 0%, var(--color-surface-2) 55%, var(--color-bank-positivo-bg) 100%)",
        }}
      >
        {pontos.map((p, i) => {
          const total = totais[i];
          const positivo = total >= 0;
          const alturaBarra = Math.max(4, (Math.abs(total) / maxAbs) * ALTURA_MAX);
          const ehHoje = p.ano === anoAtual;
          const temMarco = !!p.marcoEmoji;

          return (
            <div key={p.ano} className="flex flex-1 flex-col items-center justify-end">
              {/* Marco (emoji + título) acima da coluna */}
              <div className="mb-1 flex h-14 flex-col items-center justify-end">
                {temMarco && (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl leading-none drop-shadow-sm">{p.marcoEmoji}</span>
                    <span className="mt-0.5 max-w-[84px] text-center text-[10px] font-semibold leading-tight text-text-primary">
                      {p.marcoTitulo}
                    </span>
                  </div>
                )}
                {ehHoje && !temMarco && (
                  <span className="rounded-full bg-bank-primaria px-2 py-0.5 text-[10px] font-semibold text-white">
                    você está aqui 👇
                  </span>
                )}
              </div>

              {/* Valor acima da linha zero (só quando positivo) */}
              <span
                className="mb-0.5 text-[11px] font-semibold tabular-nums"
                style={{ color: positivo ? "var(--color-bank-positivo)" : "transparent", height: "14px" }}
              >
                {positivo ? moedaCompacta(total) : ""}
              </span>

              {/* Barra acima do zero */}
              <div className="flex h-[92px] w-full items-end justify-center">
                {positivo && (
                  <div
                    className={`w-7 rounded-t-[4px] ${ehHoje ? "ring-2 ring-bank-primaria ring-offset-1" : ""}`}
                    style={{ height: alturaBarra, background: "var(--color-bank-positivo)" }}
                  />
                )}
              </div>

              {/* Linha zero */}
              <div className="h-px w-full bg-text-faint/40" />

              {/* Barra abaixo do zero */}
              <div className="flex h-[92px] w-full items-start justify-center">
                {!positivo && (
                  <div
                    className={`w-7 rounded-b-[4px] ${ehHoje ? "ring-2 ring-bank-primaria ring-offset-1" : ""}`}
                    style={{ height: alturaBarra, background: "var(--color-bank-negativo)" }}
                  />
                )}
              </div>

              {/* Valor abaixo (só quando negativo) */}
              <span
                className="mt-0.5 text-[11px] font-semibold tabular-nums"
                style={{ color: !positivo ? "var(--color-bank-negativo)" : "transparent", height: "14px" }}
              >
                {!positivo ? moedaCompacta(total) : ""}
              </span>

              {/* Ano */}
              <span className={`mt-1.5 text-[11px] ${ehHoje ? "font-bold text-bank-primaria" : "text-text-faint"}`}>
                {p.ano}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-text-faint">
        Investido menos dívida em aberto, ano a ano — de {moedaCompacta(totais[0])} em {pontos[0].ano} até{" "}
        {moedaCompacta(totais[totais.length - 1])} projetado em {pontos[pontos.length - 1].ano}.
      </p>
    </div>
  );
}
