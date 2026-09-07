import { moedaBRL } from "@/lib/bank/formato";
import type { Jornada, PontoJornada } from "@/lib/bank/jornada";

function moedaCompacta(valor: number) {
  const sinal = valor < 0 ? "-" : "";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${sinal}R$${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `${sinal}R$${Math.round(abs / 1_000)}k`;
  return `${sinal}${moedaBRL(abs)}`;
}

// A tesoura: investido subindo em verde, dívida encolhendo em vermelho, e a
// linha do patrimônio líquido entre as duas. O gráfico antigo mostrava só o
// resultado da subtração — uma barra por ano —, então um ano de aporte forte e
// um ano de amortização forte pareciam a mesma coisa. Aqui dá pra ver QUAL das
// duas forças está trabalhando, e o ponto em que a de cima vence a de baixo.
const L = 60; // margem esquerda (rótulos do eixo)
const R = 46; // margem direita (o último ano leva rótulo de valor)
const TOPO = 84; // espaço pros marcos
const BASE = 44; // espaço pros anos
const ALT_AREA = 112; // px de cada lado da linha zero

// Degraus "redondos" pras linhas de escala — só entram os que cabem no teto.
const DEGRAUS = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000];

export function JornadaPatrimonio({ jornada }: { jornada: Jornada }) {
  const { pontos, anoAtual, anoDaVirada } = jornada;
  if (pontos.length === 0) return null;

  const largura = Math.max(720, 96 * pontos.length);
  const altura = TOPO + ALT_AREA * 2 + BASE;
  const zeroY = TOPO + ALT_AREA;

  const teto = Math.max(
    ...pontos.map((p) => Math.max(p.investimento, p.divida, Math.abs(p.liquido))),
    1,
  );
  const x = (i: number) => L + ((largura - L - R) * i) / Math.max(1, pontos.length - 1);
  // Escala de raiz quadrada: a dívida de R$700k de 2021 é 18× o líquido de
  // hoje: no linear, tudo que aconteceu depois de 2024 vira um risco colado no
  // zero e o gráfico deixa de informar justamente o ano em que se decide algo.
  // A raiz preserva sinal e ordem e devolve legibilidade aos dois extremos —
  // por isso as linhas de escala vêm rotuladas, e não só desenhadas.
  const y = (valor: number) =>
    zeroY - Math.sign(valor) * Math.sqrt(Math.abs(valor) / teto) * ALT_AREA;

  const caminho = (fn: (p: PontoJornada) => number) =>
    pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(fn(p))}`).join(" ");
  const area = (fn: (p: PontoJornada) => number) =>
    `${caminho(fn)} L ${x(pontos.length - 1)} ${zeroY} L ${x(0)} ${zeroY} Z`;

  const iAtual = pontos.findIndex((p) => p.ano === anoAtual);
  const hoje = pontos[iAtual] ?? pontos[pontos.length - 1];
  const xProjecao = iAtual >= 0 ? x(iAtual) : largura;

  const marcas = DEGRAUS.filter((d) => d <= teto * 1.02).slice(-3);

  // Marcos em anos vizinhos (2024 e 2025) colidem se ficarem na mesma linha —
  // então alternam entre duas alturas.
  const indicesComMarco = pontos.map((p, i) => (p.marcoEmoji ? i : -1)).filter((i) => i >= 0);
  const alturaDoMarco = (i: number) =>
    indicesComMarco.indexOf(i) % 2 === 0 ? TOPO - 12 : TOPO - 44;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-text-faint">Patrimônio líquido</p>
          <p
            className="numeros-tabulares text-2xl font-semibold"
            style={{
              color: hoje.liquido >= 0 ? "var(--color-bank-positivo)" : "var(--color-bank-negativo)",
            }}
          >
            {moedaBRL(hoje.liquido)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-text-faint">Investido</p>
          <p className="numeros-tabulares text-lg font-semibold text-text-primary">
            {moedaBRL(hoje.investimento)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-text-faint">Dívida em aberto</p>
          <p className="numeros-tabulares text-lg font-semibold text-text-primary">
            {moedaBRL(hoje.divida)}
          </p>
        </div>
        {anoDaVirada && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-faint">Vira o jogo em</p>
            <p className="numeros-tabulares text-lg font-semibold text-bank-primaria">
              {anoDaVirada}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className="h-auto w-full min-w-[700px]"
          role="img"
          aria-label="Evolução do investido, da dívida e do patrimônio líquido ano a ano"
        >
          <defs>
            <pattern
              id="jornada-hachura"
              width="6"
              height="6"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="var(--color-text-faint)"
                strokeWidth="1"
                opacity="0.18"
              />
            </pattern>
          </defs>

          {/* Faixa do que ainda não aconteceu */}
          <rect
            x={xProjecao}
            y={TOPO - 8}
            width={Math.max(0, largura - R - xProjecao)}
            height={ALT_AREA * 2 + 8}
            fill="url(#jornada-hachura)"
          />

          {/* Marcas de escala, espelhadas nos dois lados do zero */}
          {marcas.map((m) => (
            <g key={m}>
              <line
                x1={L}
                y1={y(m)}
                x2={largura - R}
                y2={y(m)}
                stroke="var(--color-surface-3)"
                strokeWidth="1"
              />
              <line
                x1={L}
                y1={y(-m)}
                x2={largura - R}
                y2={y(-m)}
                stroke="var(--color-surface-3)"
                strokeWidth="1"
              />
              <text x={L - 8} y={y(m) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-faint)">
                {moedaCompacta(m)}
              </text>
              <text x={L - 8} y={y(-m) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-faint)">
                {moedaCompacta(m)}
              </text>
            </g>
          ))}

          {/* Investido para cima, dívida espelhada para baixo */}
          <path d={area((p) => p.investimento)} fill="var(--color-bank-positivo)" opacity="0.16" />
          <path
            d={caminho((p) => p.investimento)}
            fill="none"
            stroke="var(--color-bank-positivo)"
            strokeWidth="2"
          />
          <path d={area((p) => -p.divida)} fill="var(--color-bank-negativo)" opacity="0.16" />
          <path
            d={caminho((p) => -p.divida)}
            fill="none"
            stroke="var(--color-bank-negativo)"
            strokeWidth="2"
          />

          <line
            x1={L}
            y1={zeroY}
            x2={largura - R}
            y2={zeroY}
            stroke="var(--color-text-faint)"
            strokeWidth="1"
          />

          {/* Patrimônio líquido */}
          <path
            d={caminho((p) => p.liquido)}
            fill="none"
            stroke="var(--color-text-primary)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {pontos.map((p, i) => {
            const ehHoje = p.ano === anoAtual;
            const rotula = ehHoje || i === 0 || i === pontos.length - 1 || !!p.marcoEmoji;
            return (
              <g key={p.ano}>
                <circle
                  cx={x(i)}
                  cy={y(p.liquido)}
                  r={ehHoje ? 5 : 3}
                  fill={ehHoje ? "var(--color-bank-primaria)" : "var(--color-surface-1)"}
                  stroke={ehHoje ? "var(--color-surface-1)" : "var(--color-text-primary)"}
                  strokeWidth={ehHoje ? 2.5 : 1.5}
                />
                {/* Valor só nos extremos, no hoje e nos marcos — rotular tudo polui e ninguém lê. */}
                {rotula && (
                  <text
                    x={x(i)}
                    y={y(p.liquido) + (p.liquido >= 0 ? -12 : 20)}
                    textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}
                    fontSize="11"
                    fontWeight="600"
                    fill={
                      p.liquido >= 0 ? "var(--color-bank-positivo)" : "var(--color-bank-negativo)"
                    }
                  >
                    {moedaCompacta(p.liquido)}
                  </text>
                )}

                {p.marcoEmoji && (
                  <g>
                    <line
                      x1={x(i)}
                      y1={alturaDoMarco(i) + 4}
                      x2={x(i)}
                      y2={zeroY + ALT_AREA}
                      stroke="var(--color-text-faint)"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                      opacity="0.5"
                    />
                    <text x={x(i)} y={alturaDoMarco(i) - 16} textAnchor="middle" fontSize="19">
                      {p.marcoEmoji}
                    </text>
                    <text
                      x={x(i)}
                      y={alturaDoMarco(i)}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="var(--color-text-primary)"
                    >
                      {p.marcoTitulo}
                    </text>
                  </g>
                )}

                {/* O ano — e, no ano corrente, a pílula "você está aqui" no
                    lugar dele: no topo ela brigava com o rótulo dos marcos. */}
                {ehHoje ? (
                  <g>
                    <rect
                      x={x(i) - 46}
                      y={altura - 30}
                      width="92"
                      height="19"
                      rx="9.5"
                      fill="var(--color-bank-primaria)"
                    />
                    <text
                      x={x(i)}
                      y={altura - 16.5}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#ffffff"
                    >
                      {`${p.ano} · você aqui`}
                    </text>
                  </g>
                ) : (
                  <text
                    x={x(i)}
                    y={altura - 16}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--color-text-faint)"
                  >
                    {p.ano}
                  </text>
                )}

                {/* Faixa invisível só pro tooltip nativo do navegador */}
                <rect
                  x={x(i) - (largura - L - R) / (pontos.length * 2)}
                  y={TOPO}
                  width={(largura - L - R) / pontos.length}
                  height={ALT_AREA * 2}
                  fill="transparent"
                >
                  <title>
                    {`${p.ano}${p.projetado ? " (projeção)" : ehHoje ? " (hoje)" : ""}\nInvestido: ${moedaBRL(
                      p.investimento,
                    )}\nDívida: ${moedaBRL(p.divida)}\nLíquido: ${moedaBRL(p.liquido)}`}
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11px] text-text-faint">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-sm"
              style={{ background: "var(--color-bank-positivo)", opacity: 0.5 }}
            />
            investido
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-sm"
              style={{ background: "var(--color-bank-negativo)", opacity: 0.5 }}
            />
            dívida em aberto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ background: "var(--color-text-primary)" }} />
            patrimônio líquido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm border border-text-faint/30 bg-text-faint/10" />
            projeção
          </span>
        </div>
        <p>
          Carteira a mercado menos o principal em aberto. A projeção usa o cronograma real das
          parcelas e o aporte do plano.
        </p>
      </div>
    </div>
  );
}
