import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA, type GrupoOrcamento } from "@/lib/bank/tipos";
import { calcularScoreSaude } from "@/lib/bank/score";
import { montarPanoramaSemanal } from "@/lib/bank/semanas";
import type { ContextoAgente, MembroTelegram } from "@/lib/bank/agente/tipos";
import {
  diasRestantesNaSemana,
  hojeSP,
  primeiroDoMes,
  segundaDaSemana,
  somarDias,
} from "@/lib/bank/agente/datas";

/**
 * Quem mandou a mensagem. Retorna null quando o par (grupo, pessoa) não está
 * cadastrado — é a porta de entrada do agente e o único ponto onde ele decide
 * se responde ou não.
 */
export async function identificarMembro(
  supabase: SupabaseClient,
  chatId: number,
  userId: number,
): Promise<MembroTelegram | null> {
  const { data } = await supabase
    .from("telegram_membros")
    .select(
      "id, entidade_id, telegram_chat_id, telegram_user_id, pessoa_id, nome_telegram, ativo, pessoa:pessoas(nome)",
    )
    .eq("telegram_chat_id", chatId)
    .eq("telegram_user_id", userId)
    .maybeSingle();

  if (!data || data.ativo === false) return null;

  // O join vem como objeto (many-to-one), mas o client sem tipos gerados o
  // infere como array — aceita os dois formatos.
  const relacao = data.pessoa as unknown as { nome: string } | { nome: string }[] | null;
  const pessoa = Array.isArray(relacao) ? (relacao[0] ?? null) : relacao;
  return {
    id: data.id,
    entidade_id: data.entidade_id,
    telegram_chat_id: Number(data.telegram_chat_id),
    telegram_user_id: Number(data.telegram_user_id),
    pessoa_id: data.pessoa_id,
    nome_telegram: data.nome_telegram,
    pessoa_nome: pessoa?.nome ?? null,
  };
}

/**
 * Contexto ampliado, para os resumos agendados (fim do dia, fim de semana,
 * virada de mês). Custa mais consultas que o `montarContexto` do caminho
 * rápido, mas roda poucas vezes por dia — e é o que dá ao consultor os
 * números de dívida e score sem ele precisar inventar nenhum.
 */
export async function montarContextoCompleto(supabase: SupabaseClient) {
  const membroSintetico: MembroTelegram = {
    id: "resumo",
    entidade_id: ENTIDADE_FAMILIA,
    telegram_chat_id: 0,
    telegram_user_id: 0,
    pessoa_id: null,
    nome_telegram: null,
    pessoa_nome: null,
  };

  const [base, score, { data: dividas }, { data: metas }] = await Promise.all([
    montarContexto(supabase, membroSintetico),
    calcularScoreSaude(supabase),
    supabase
      .from("dividas")
      .select("descricao, valor_total, valor_pago")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("quitada", false),
    supabase
      .from("metas")
      .select("titulo, valor_alvo, valor_atual")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("status", "em_andamento"),
  ]);

  return {
    ...base,
    score: {
      total: score.total,
      pilares: score.pilares.map((p) => ({ nome: p.rotulo, pontos: p.pontos, dica: p.dica })),
      maiorAlavanca: score.maiorAlavanca.rotulo,
    },
    dividas: (dividas ?? []).map((d) => ({
      descricao: d.descricao,
      total: Number(d.valor_total),
      pago: Number(d.valor_pago ?? 0),
      restante: Number(d.valor_total) - Number(d.valor_pago ?? 0),
    })),
    metas: (metas ?? []).map((m) => ({
      titulo: m.titulo,
      alvo: Number(m.valor_alvo),
      atual: Number(m.valor_atual ?? 0),
    })),
  };
}

type TransacaoLeve = {
  valor: number;
  data: string;
  descricao: string;
  categoria: {
    nome: string;
    tipo: "receita" | "despesa";
    grupo_orcamento: GrupoOrcamento | null;
    conta_na_semana: boolean | null;
  } | null;
};

/** Regra única do que entra na conta da semana — usada aqui e no executar. */
export function entraNaSemana(categoria: { tipo?: string; conta_na_semana?: boolean | null } | null) {
  return categoria?.tipo === "despesa" && categoria?.conta_na_semana !== false;
}

/**
 * Snapshot compacto do estado financeiro da família para o prompt.
 *
 * Fica de propósito no caminho rápido: só o que o agente precisa para
 * categorizar um gasto e devolver o status da semana. Dívida, score e
 * próximas contas ficam no /api/bank/agente/contexto, usado pelos resumos
 * agendados — carregar isso a cada "mercado 230" só somaria latência.
 */
export async function montarContexto(
  supabase: SupabaseClient,
  membro: MembroTelegram,
): Promise<ContextoAgente> {
  const hoje = hojeSP();
  const inicioSemana = segundaDaSemana(hoje);
  const fimSemana = somarDias(inicioSemana, 6);
  const inicioMes = primeiroDoMes(hoje);
  // A semana pode começar no mês anterior — puxa da data mais antiga das duas.
  const desde = inicioSemana < inicioMes ? inicioSemana : inicioMes;

  const entidadeId = membro.entidade_id || ENTIDADE_FAMILIA;

  const [panorama, { data: categorias }, { data: cartoes }, { data: transacoes }] =
    await Promise.all([
      // A leitura semanal (por categoria, por dia, média das anteriores) é a
      // mesma que a tela /bank/semanas mostra — o consultor e o site nunca
      // divergem sobre a mesma semana.
      montarPanoramaSemanal(supabase, entidadeId, { hoje }),
      supabase
        .from("categorias")
        .select("id, nome, grupo_orcamento, tipo, conta_na_semana")
        .eq("entidade_id", entidadeId)
        .order("nome"),
      supabase
        .from("cartoes")
        .select("id, nome, titular")
        .eq("entidade_id", entidadeId)
        .order("nome"),
      supabase
        .from("transacoes")
        .select(
          "valor, data, descricao, categoria:categorias(nome, tipo, grupo_orcamento, conta_na_semana)",
        )
        .eq("entidade_id", entidadeId)
        .gte("data", desde)
        .order("data", { ascending: false }),
    ]);

  const lista = (transacoes ?? []) as unknown as TransacaoLeve[];
  const despesas = lista.filter((t) => t.categoria?.tipo === "despesa");
  const doMes = despesas.filter((t) => t.data >= inicioMes);
  const porGrupo = {
    essencial_50: 0,
    liberdade_30: 0,
    investimento_20: 0,
  };
  for (const t of doMes) {
    const grupo = t.categoria?.grupo_orcamento;
    if (grupo && grupo in porGrupo) {
      porGrupo[grupo as keyof typeof porGrupo] += Number(t.valor);
    }
  }

  return {
    hoje,
    entidadeId,
    pessoa:
      membro.pessoa_id && membro.pessoa_nome
        ? { id: membro.pessoa_id, nome: membro.pessoa_nome }
        : null,
    categorias: (categorias ?? []) as ContextoAgente["categorias"],
    cartoes: (cartoes ?? []) as ContextoAgente["cartoes"],
    semana: {
      inicio: panorama.atual.inicio,
      fim: panorama.atual.fim,
      meta: panorama.atual.meta,
      gasto: panorama.atual.gasto,
      diasRestantes: diasRestantesNaSemana(hoje),
      diasDecorridos: panorama.atual.diasDecorridos,
      projecao: panorama.atual.projecao,
      // Só as categorias que já têm gasto ou plano — mandar 28 linhas zeradas
      // no prompt gasta token e não diz nada.
      porCategoria: panorama.atual.porCategoria
        .filter((c) => c.gasto > 0 || c.alvo != null)
        .map((c) => ({ nome: c.nome, gasto: c.gasto, alvo: c.alvo, media: c.media })),
      porDia: panorama.atual.porDia.map((d) => ({ diaSemana: d.diaSemana, total: d.total })),
      porPessoa: panorama.atual.porPessoa,
    },
    historico: {
      mediaSemanal: panorama.mediaHistorica,
      streak: panorama.streak,
      semanas: panorama.anteriores.map((s) => ({
        inicio: s.inicio,
        gasto: s.gasto,
        meta: s.meta,
      })),
    },
    mes: {
      inicio: inicioMes,
      gasto: doMes.reduce((soma, t) => soma + Number(t.valor), 0),
      porGrupo,
    },
    ultimos: lista.slice(0, 5).map((t) => ({
      descricao: t.descricao,
      valor: Number(t.valor),
      data: t.data,
      categoria: t.categoria?.nome ?? null,
    })),
  };
}
