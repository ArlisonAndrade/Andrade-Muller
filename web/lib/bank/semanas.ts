import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeSP, segundaDaSemana, somarDias } from "@/lib/bank/agente/datas";

// Leitura semanal do orçamento — fonte única da página /bank/semanas, do
// contexto do consultor no Telegram e dos resumos agendados.
//
// A regra que dá sentido a tudo: só entra aqui o gasto que se DECIDE na
// semana (categorias.conta_na_semana). Conta fixa, parcela e aporte ficam de
// fora — comparar semana com semana incluindo o aluguel não diz nada sobre
// comportamento, que é o que o consultor precisa enxergar.

export const SEMANAS_DE_HISTORICO = 8;

export type CategoriaSemana = {
  categoriaId: string;
  nome: string;
  gasto: number;
  /** Fatia planejada da meta, em reais. Null quando a categoria não tem plano. */
  alvo: number | null;
  percentualAlvo: number | null;
  /** Média dessa categoria nas semanas anteriores — o "normal". */
  media: number | null;
};

export type DiaSemana = { data: string; diaSemana: string; total: number };

export type SemanaResumo = {
  inicio: string;
  fim: string;
  meta: number | null;
  gasto: number;
  /** Quantos dos 7 dias já passaram (1..7). No passado, sempre 7. */
  diasDecorridos: number;
  diasRestantes: number;
  /** Onde a semana fecha se o ritmo atual continuar. Null em semana fechada. */
  projecao: number | null;
  porCategoria: CategoriaSemana[];
  porDia: DiaSemana[];
  porPessoa: { nome: string; total: number }[];
};

export type PanoramaSemanal = {
  atual: SemanaResumo;
  anteriores: SemanaResumo[];
  /** Média semanal das semanas fechadas — a régua do "mais que o normal". */
  mediaHistorica: number | null;
  /** Semanas fechadas seguidas dentro da meta, da mais recente pra trás. */
  streak: number;
};

type LinhaTransacao = {
  valor: number;
  data: string;
  descricao: string;
  categoria_id: string | null;
  categoria: { nome: string; tipo: string; conta_na_semana: boolean | null } | null;
  pessoa: { nome: string } | null;
};

const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function rotuloDia(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return DIAS_CURTOS[(d.getUTCDay() + 6) % 7];
}

/**
 * Panorama completo: semana corrente + as anteriores para servir de régua.
 *
 * Faz UMA consulta cobrindo todo o intervalo e agrega em memória. São poucas
 * centenas de linhas por trimestre num orçamento familiar — não vale um
 * round-trip por semana, e o caminho do Telegram é sensível a latência.
 */
export async function montarPanoramaSemanal(
  supabase: SupabaseClient,
  entidadeId: string,
  opcoes: { hoje?: string; semanas?: number } = {},
): Promise<PanoramaSemanal> {
  const hoje = opcoes.hoje ?? hojeSP();
  const quantas = opcoes.semanas ?? SEMANAS_DE_HISTORICO;
  const inicioAtual = segundaDaSemana(hoje);
  const inicioJanela = somarDias(inicioAtual, -7 * quantas);
  const fimAtual = somarDias(inicioAtual, 6);

  const [{ data: transacoes }, { data: metasSemana }, { data: planoCategorias }] =
    await Promise.all([
      supabase
        .from("transacoes")
        .select(
          "valor, data, descricao, categoria_id, categoria:categorias(nome, tipo, conta_na_semana), pessoa:pessoas(nome)",
        )
        .eq("entidade_id", entidadeId)
        .gte("data", inicioJanela)
        .lte("data", fimAtual),
      supabase
        .from("semanas_orcamento")
        .select("semana_inicio, meta")
        .eq("entidade_id", entidadeId)
        .lte("semana_inicio", inicioAtual)
        .order("semana_inicio", { ascending: false })
        .limit(quantas + 1),
      supabase
        .from("metas_semana_categoria")
        .select("categoria_id, percentual, categoria:categorias(nome)")
        .eq("entidade_id", entidadeId),
    ]);

  const lista = (transacoes ?? []) as unknown as LinhaTransacao[];
  const doOrcamento = lista.filter(
    (t) => t.categoria?.tipo === "despesa" && t.categoria?.conta_na_semana !== false,
  );

  // Meta por semana, com herança: semana sem linha própria usa a meta mais
  // recente anterior a ela. É o mesmo comportamento do consultor — a meta
  // vale até ser mudada, não expira na virada da segunda.
  const metasOrdenadas = (metasSemana ?? [])
    .map((m) => ({ inicio: String(m.semana_inicio), meta: Number(m.meta) }))
    .sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
  const metaDaSemana = (inicio: string): number | null =>
    metasOrdenadas.find((m) => m.inicio <= inicio)?.meta ?? null;

  const plano = (planoCategorias ?? []).map((p) => {
    const rel = p.categoria as unknown as { nome: string } | { nome: string }[] | null;
    const cat = Array.isArray(rel) ? (rel[0] ?? null) : rel;
    return {
      categoriaId: String(p.categoria_id),
      nome: cat?.nome ?? "—",
      percentual: Number(p.percentual),
    };
  });

  const inicios: string[] = [];
  for (let i = quantas; i >= 0; i--) inicios.push(somarDias(inicioAtual, -7 * i));

  const resumos = inicios.map((inicio) =>
    resumirSemana(doOrcamento, inicio, metaDaSemana(inicio), plano, hoje),
  );

  const atual = resumos[resumos.length - 1];
  // Semana sem nenhum lançamento no passado é buraco de registro, não semana
  // de R$ 0 — incluí-la na média puxaria o "normal" para baixo e o consultor
  // acusaria estouro em semana comum.
  const anteriores = resumos.slice(0, -1).filter((s) => s.gasto > 0);

  const mediaHistorica =
    anteriores.length > 0
      ? anteriores.reduce((s, r) => s + r.gasto, 0) / anteriores.length
      : null;

  let streak = 0;
  for (let i = anteriores.length - 1; i >= 0; i--) {
    const s = anteriores[i];
    if (s.meta != null && s.gasto <= s.meta) streak++;
    else break;
  }

  // Média por categoria vira o "normal" de cada uma na semana corrente.
  for (const cat of atual.porCategoria) {
    const historico = anteriores
      .map((s) => s.porCategoria.find((c) => c.categoriaId === cat.categoriaId)?.gasto ?? 0)
      .filter((_, i) => anteriores[i].gasto > 0);
    cat.media = historico.length > 0 ? historico.reduce((a, b) => a + b, 0) / historico.length : null;
  }

  return { atual, anteriores, mediaHistorica, streak };
}

function resumirSemana(
  transacoes: LinhaTransacao[],
  inicio: string,
  meta: number | null,
  plano: { categoriaId: string; nome: string; percentual: number }[],
  hoje: string,
): SemanaResumo {
  const fim = somarDias(inicio, 6);
  const daSemana = transacoes.filter((t) => t.data >= inicio && t.data <= fim);
  const gasto = daSemana.reduce((s, t) => s + Number(t.valor), 0);

  // Semana futura ainda não começou; semana passada já fechou com 7 dias.
  const decorridos = hoje < inicio ? 0 : hoje > fim ? 7 : diasEntre(inicio, hoje) + 1;
  const restantes = Math.max(0, 7 - decorridos);

  const totaisPorCategoria = new Map<string, { nome: string; gasto: number }>();
  for (const t of daSemana) {
    const id = t.categoria_id ?? "sem-categoria";
    const atual = totaisPorCategoria.get(id) ?? { nome: t.categoria?.nome ?? "Sem categoria", gasto: 0 };
    atual.gasto += Number(t.valor);
    totaisPorCategoria.set(id, atual);
  }
  // Categoria planejada sem gasto ainda aparece — a fatia não usada é
  // informação tão útil quanto a estourada.
  for (const p of plano) {
    if (!totaisPorCategoria.has(p.categoriaId)) {
      totaisPorCategoria.set(p.categoriaId, { nome: p.nome, gasto: 0 });
    }
  }

  const porCategoria: CategoriaSemana[] = [...totaisPorCategoria.entries()]
    .map(([categoriaId, v]) => {
      const planejada = plano.find((p) => p.categoriaId === categoriaId);
      return {
        categoriaId,
        nome: v.nome,
        gasto: Math.round(v.gasto * 100) / 100,
        percentualAlvo: planejada?.percentual ?? null,
        alvo: planejada && meta != null ? Math.round(((meta * planejada.percentual) / 100) * 100) / 100 : null,
        media: null,
      };
    })
    .sort((a, b) => b.gasto - a.gasto || a.nome.localeCompare(b.nome));

  const porDia: DiaSemana[] = [];
  for (let i = 0; i < 7; i++) {
    const data = somarDias(inicio, i);
    porDia.push({
      data,
      diaSemana: rotuloDia(data),
      total:
        Math.round(
          daSemana.filter((t) => t.data === data).reduce((s, t) => s + Number(t.valor), 0) * 100,
        ) / 100,
    });
  }

  const totaisPorPessoa = new Map<string, number>();
  for (const t of daSemana) {
    const nome = t.pessoa?.nome ?? "Sem responsável";
    totaisPorPessoa.set(nome, (totaisPorPessoa.get(nome) ?? 0) + Number(t.valor));
  }

  return {
    inicio,
    fim,
    meta,
    gasto: Math.round(gasto * 100) / 100,
    diasDecorridos: decorridos,
    diasRestantes: restantes,
    projecao:
      decorridos > 0 && decorridos < 7 ? Math.round((gasto / decorridos) * 7 * 100) / 100 : null,
    porCategoria,
    porDia,
    porPessoa: [...totaisPorPessoa.entries()]
      .map(([nome, total]) => ({ nome, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total),
  };
}

function diasEntre(de: string, ate: string): number {
  const a = new Date(`${de}T12:00:00Z`).getTime();
  const b = new Date(`${ate}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}
