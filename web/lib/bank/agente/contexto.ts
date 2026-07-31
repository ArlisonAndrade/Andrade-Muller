import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA, type GrupoOrcamento } from "@/lib/bank/tipos";
import { calcularScoreSaude } from "@/lib/bank/score";
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

  const [{ data: categorias }, { data: cartoes }, { data: semana }, { data: transacoes }] =
    await Promise.all([
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
      // A meta vale até ser mudada: sem linha para esta semana, herda a da
      // semana mais recente já cadastrada. Sem isso a régua sumiria toda
      // segunda-feira e alguém teria que lembrar de recadastrar.
      supabase
        .from("semanas_orcamento")
        .select("meta, semana_inicio")
        .eq("entidade_id", entidadeId)
        .lte("semana_inicio", inicioSemana)
        .order("semana_inicio", { ascending: false })
        .limit(1)
        .maybeSingle(),
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

  // A meta semanal é sobre o gasto que se decide na semana — conta fixa,
  // parcela e aporte ficam de fora (categorias.conta_na_semana).
  const gastoSemana = lista
    .filter((t) => entraNaSemana(t.categoria) && t.data >= inicioSemana && t.data <= fimSemana)
    .reduce((soma, t) => soma + Number(t.valor), 0);

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
      inicio: inicioSemana,
      fim: fimSemana,
      meta: semana?.meta != null ? Number(semana.meta) : null,
      gasto: gastoSemana,
      diasRestantes: diasRestantesNaSemana(hoje),
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
