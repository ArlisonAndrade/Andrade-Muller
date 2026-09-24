import { rotuloMes } from "@/lib/bank/plano";
import type { ConteudoReuniao } from "@/lib/bank/tv/conteudo-reuniao";

// Slides da reunião trimestral que misturam o banco com conteúdo escrito
// (lib/bank/tv/conteudo-reuniao.ts). Sem estado: renderizam no servidor,
// dentro de app/bank/tv/page.tsx. Tipografia pensada pra ler do sofá.

const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const mesesEntre = (de: number, ate: number) =>
  (Math.floor(ate / 100) - Math.floor(de / 100)) * 12 + ((ate % 100) - (de % 100));

const entrada = (n: number) => ({ animation: "fade-slide-in 0.45s ease-out both", animationDelay: `${n * 120}ms` });

// ─── O que construímos ──────────────────────────────────────────────────────

function GraficoCarteira({ pontos }: { pontos: Array<{ mes: number; valor: number }> }) {
  const L = 1000;
  const A = 250;
  const margem = { topo: 44, base: 40, lado: 40 };
  const max = Math.max(...pontos.map((p) => p.valor)) * 1.08;
  const x = (i: number) => margem.lado + (i / Math.max(1, pontos.length - 1)) * (L - margem.lado * 2);
  const y = (v: number) => margem.topo + (1 - v / max) * (A - margem.topo - margem.base);
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(pontos.length - 1)},${A - margem.base} L${x(0)},${A - margem.base} Z`;
  const ultimo = pontos[pontos.length - 1].mes;
  // Rótulo no primeiro, no último e em cada janeiro/junho — menos os que
  // encostariam no último (poluiria o fim da linha, onde está o destaque).
  const rotulado = (p: { mes: number }, i: number) =>
    i === 0 || i === pontos.length - 1 || ([1, 6].includes(p.mes % 100) && mesesEntre(p.mes, ultimo) > 3);

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label="Evolução da carteira a mercado">
      <defs>
        <linearGradient id="area-construimos" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={margem.lado} x2={L - margem.lado} y1={A - margem.base} y2={A - margem.base} stroke="rgba(255,255,255,0.25)" />
      <path d={area} fill="url(#area-construimos)" />
      <path d={linha} fill="none" stroke="#6ee7b7" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) =>
        rotulado(p, i) ? (
          <g key={p.mes}>
            <circle cx={x(i)} cy={y(p.valor)} r={i === pontos.length - 1 ? 9 : 6} fill="#fff" stroke="#10b981" strokeWidth={3} />
            <text
              x={x(i)}
              y={y(p.valor) - 18}
              textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}
              fill="#fff"
              fontSize={i === pontos.length - 1 ? 26 : 21}
              fontWeight={700}
            >
              {brl0(p.valor)}
            </text>
            <text
              x={x(i)}
              y={A - margem.base + 28}
              textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}
              fill="rgba(255,255,255,0.7)"
              fontSize={18}
            >
              {rotuloMes(p.mes)}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  );
}

export function SlideConstruimos({
  evolucao,
  cards,
}: {
  evolucao: Array<{ mes: number; valor: number }>;
  cards?: NonNullable<ConteudoReuniao["construimos"]>["cards"];
}) {
  if (evolucao.length < 2) return <p className="text-2xl text-white/80">Ainda não há fotos mensais suficientes da carteira.</p>;
  const primeiro = evolucao[0];
  const ultimo = evolucao[evolucao.length - 1];
  const ganho = ultimo.valor - primeiro.valor;
  const pct = primeiro.valor > 0 ? (ganho / primeiro.valor) * 100 : null;
  const meses = mesesEntre(primeiro.mes, ultimo.mes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1" style={entrada(0)}>
        <p className="text-5xl font-bold text-emerald-300 numeros-tabulares sm:text-6xl">
          {pct != null ? `+${Math.round(pct)}%` : brl0(ganho)}
        </p>
        <p className="text-2xl text-white/90">
          em {meses} meses <span className="text-white/60">·</span>{" "}
          <span className="font-semibold numeros-tabulares">{ganho >= 0 ? "+" : ""}{brl0(ganho)}</span> na carteira
        </p>
      </div>
      <div className="rounded-[20px] bg-white/5 px-4 py-3 sm:px-6" style={entrada(1)}>
        <GraficoCarteira pontos={evolucao} />
      </div>
      {cards && cards.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 ${cards.length >= 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
          {cards.map((c, i) => (
            <div key={c.titulo} className="rounded-[18px] bg-white/10 p-5" style={entrada(i + 2)}>
              <p className="text-sm font-medium uppercase tracking-wide text-white/70">
                <span aria-hidden>{c.emoji}</span> {c.titulo}
              </p>
              <p className="mt-1 text-3xl font-bold numeros-tabulares">{c.valor}</p>
              <p className="mt-2 text-base leading-snug text-white/80">{c.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Onde estamos na régua do Brasil ────────────────────────────────────────

export function SlideRegua({ regua }: { regua: NonNullable<ConteudoReuniao["regua"]> }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-[20px] bg-white/10" style={entrada(0)}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm uppercase tracking-wide text-white/60">
                <th className="px-5 py-3 font-medium">Indicador</th>
                <th className="px-5 py-3 text-right font-medium">Brasil</th>
                <th className="px-5 py-3 text-right font-medium">Nós</th>
              </tr>
            </thead>
            <tbody>
              {regua.linhas.map((l) => (
                <tr key={l.indicador} className="border-t border-white/10 text-xl">
                  <td className="px-5 py-3.5">{l.indicador}</td>
                  <td className="px-5 py-3.5 text-right text-white/70 numeros-tabulares">{l.brasil}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-300 numeros-tabulares">
                    {l.nos}
                    {l.ressalva && <span className="text-white/70">*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-white/10 px-5 py-3 text-sm text-white/60">* {regua.ressalva}</p>
        </div>
        <div className="flex flex-col gap-4">
          {regua.contexto.map((c, i) => (
            <p key={c} className="rounded-[18px] bg-black/25 p-5 text-xl leading-snug" style={entrada(i + 1)}>
              {c}
            </p>
          ))}
        </div>
      </div>
      <p className="text-3xl font-semibold leading-snug sm:text-4xl" style={entrada(3)}>
        “{regua.fecho}”
      </p>
      <p className="text-xs text-white/50">{regua.fontes}</p>
    </div>
  );
}

// ─── O que aconteceu e o que a gente escolheu fazer ─────────────────────────

export function SlideEscolhas({ escolhas }: { escolhas: NonNullable<ConteudoReuniao["escolhas"]> }) {
  const coluna = (titulo: string, itens: string[], marca: string, atraso: number) => (
    <div className="flex flex-col gap-4 rounded-[20px] bg-white/10 p-5" style={entrada(atraso)}>
      <p className="text-sm font-semibold uppercase tracking-widest text-white/70">{titulo}</p>
      <ul className="flex flex-col gap-4">
        {itens.map((t) => (
          <li key={t} className="flex gap-3 text-lg leading-snug">
            <span aria-hidden className="shrink-0">
              {marca}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {coluna("O que pesou", escolhas.pesou, "•", 0)}
        {coluna("O que a gente fez", escolhas.fizemos, "✓", 1)}
      </div>
      <p className="rounded-[20px] border border-white/20 bg-black/25 p-5 text-2xl font-semibold leading-snug" style={entrada(2)}>
        “{escolhas.fecho}”
      </p>
    </div>
  );
}

// ─── O ar que vem ───────────────────────────────────────────────────────────

export function SlideArQueVem({ ar }: { ar: NonNullable<ConteudoReuniao["arQueVem"]> }) {
  const [perto, promocao] = ar.blocos;
  // Ordem cronológica: daqui a 2 meses → junho de 2027 (o destaque, mais
  // largo) → onde isso nos coloca (faixa inteira embaixo).
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-[20px] bg-white/10 p-5" style={entrada(0)}>
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">{perto.quando}</p>
          <p className="text-4xl font-bold numeros-tabulares">{perto.valor}</p>
          <p className="text-lg text-white/80">{perto.detalhe}</p>
          {perto.apoio && <p className="mt-auto pt-2 text-lg font-medium text-sky-200">{perto.apoio}</p>}
        </div>

        <div className="flex flex-col gap-3 rounded-[20px] bg-white p-5 text-slate-900 shadow-2xl lg:col-span-2" style={entrada(1)}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">{promocao.quando}</p>
            <p className="text-base text-slate-600">
              {promocao.detalhe} {promocao.apoio}
            </p>
          </div>
          <p className="text-3xl font-bold text-emerald-600 numeros-tabulares">{promocao.valor}</p>
          {promocao.destaque && <p className="text-2xl font-bold leading-snug sm:text-[1.75rem]">{promocao.destaque}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[20px] bg-white/10 p-5 sm:flex-row sm:items-center sm:gap-8" style={entrada(2)}>
        <p className="shrink-0 text-sm font-semibold uppercase tracking-widest text-white/70">{ar.renda.titulo}</p>
        <div className="flex flex-1 flex-wrap gap-x-10 gap-y-3">
          {ar.renda.linhas.map((l) => (
            <div key={l.ano}>
              <p className="text-sm text-white/60">{l.ano}</p>
              <p className="text-2xl font-semibold numeros-tabulares">
                {l.valor} <span className="text-lg font-medium text-emerald-300">{l.variacao !== "—" ? l.variacao : ""}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs leading-snug text-white/60 sm:max-w-[260px]">{ar.renda.nota}</p>
      </div>

      <p className="text-2xl font-semibold leading-snug" style={entrada(3)}>
        “{ar.fecho}”
      </p>
    </div>
  );
}
