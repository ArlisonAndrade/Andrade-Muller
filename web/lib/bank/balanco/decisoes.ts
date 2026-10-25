import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { balancoJaPodeSair, dataCurta } from "@/lib/bank/balanco/calendario";

// Decisões do trimestre no Telegram (pedido do Arlison, 25/out/2026: as
// decisões entram antes do balanço, e cada um responde por si). As perguntas
// ficam em `decisoes_perguntas`, cada clique em `decisoes_respostas` — uma
// resposta por pessoa, que pode ser trocada até o balanço fechar.
//
// O botão manda "dec:<id da pergunta>:<índice da opção>" (o callback_data do
// Telegram tem teto de 64 bytes; uuid + índice cabe).

export type Pessoa = { id: string; nome: string };

export type PerguntaDecisao = {
  id: string;
  numero: number;
  texto: string;
  opcoes: string[];
  /** pessoa_id → índice da opção */
  respostas: Map<string, number>;
};

export type EstadoDecisoes = {
  trimestre: string;
  perguntas: PerguntaDecisao[];
  pessoas: Pessoa[];
  completas: boolean;
  /** quem ainda não respondeu o quê */
  faltam: Array<{ pessoa: Pessoa; numeros: number[] }>;
  perguntasEnviadasEm: string | null;
  fechadasEm: string | null;
};

/** As pessoas que respondem: as que estão no grupo da família no Telegram. */
async function pessoasDoGrupo(supabase: SupabaseClient): Promise<Pessoa[]> {
  const { data, error } = await supabase
    .from("telegram_membros")
    .select("pessoa_id, pessoa:pessoas!inner(id, nome, ordem)")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("ativo", true)
    .lt("telegram_chat_id", 0)
    .not("pessoa_id", "is", null);
  if (error) throw new Error(`Pessoas do grupo: ${error.message}`);
  const vistas = new Map<string, Pessoa & { ordem: number }>();
  for (const linha of data ?? []) {
    const p = linha.pessoa as unknown as { id: string; nome: string; ordem: number | null };
    if (p && !vistas.has(p.id)) vistas.set(p.id, { id: p.id, nome: p.nome, ordem: p.ordem ?? 0 });
  }
  return [...vistas.values()].sort((a, b) => a.ordem - b.ordem).map(({ id, nome }) => ({ id, nome }));
}

export async function lerDecisoes(supabase: SupabaseClient, trimestre: string): Promise<EstadoDecisoes> {
  const [{ data: perguntas, error }, pessoas, { data: balanco, error: erroBalanco }] = await Promise.all([
    supabase
      .from("decisoes_perguntas")
      .select("id, numero, texto, opcoes, respostas:decisoes_respostas(pessoa_id, opcao)")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("trimestre", trimestre)
      .order("numero"),
    pessoasDoGrupo(supabase),
    supabase
      .from("balancos_trimestrais")
      .select("perguntas_enviadas_em, decisoes_fechadas_em")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("trimestre", trimestre)
      .maybeSingle(),
  ]);
  if (error) throw new Error(`Decisões: ${error.message}`);
  if (erroBalanco) throw new Error(`Decisões: ${erroBalanco.message}`);

  const lista: PerguntaDecisao[] = (perguntas ?? []).map((p) => ({
    id: p.id,
    numero: p.numero,
    texto: p.texto,
    opcoes: (p.opcoes as string[]) ?? [],
    respostas: new Map(((p.respostas as Array<{ pessoa_id: string; opcao: number }>) ?? []).map((r) => [r.pessoa_id, r.opcao])),
  }));
  const faltam = pessoas
    .map((pessoa) => ({ pessoa, numeros: lista.filter((p) => !p.respostas.has(pessoa.id)).map((p) => p.numero) }))
    .filter((f) => f.numeros.length > 0);

  return {
    trimestre,
    perguntas: lista,
    pessoas,
    completas: lista.length > 0 && faltam.length === 0,
    faltam,
    perguntasEnviadasEm: balanco?.perguntas_enviadas_em ?? null,
    fechadasEm: balanco?.decisoes_fechadas_em ?? null,
  };
}

const listaNumeros = (n: number[]) =>
  n.length === 1 ? `a pergunta ${n[0]}` : `as perguntas ${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;

/** "Franciele: faltam as perguntas 1, 2 e 3." — uma linha por pessoa. */
export function linhasDeCobranca(e: EstadoDecisoes): string[] {
  return e.pessoas.map((p) => {
    const falta = e.faltam.find((f) => f.pessoa.id === p.id);
    if (!falta) return `✅ ${p.nome}: respondeu todas.`;
    return `⏳ ${p.nome}: ${falta.numeros.length === 1 ? "falta" : "faltam"} ${listaNumeros(falta.numeros)}.`;
  });
}

/** O teclado de uma pergunta, no formato do nó do Telegram do n8n (um botão por linha). */
export function tecladoDaPergunta(p: PerguntaDecisao) {
  return {
    rows: p.opcoes.map((texto, i) => ({
      row: { buttons: [{ text: texto, additionalFields: { callback_data: `dec:${p.id}:${i}` } }] },
    })),
  };
}

export type ResultadoClique = { texto: string; completou: boolean; trimestre: string | null };

/** Um clique num botão de decisão. Devolve a frase que o Arkad responde no grupo. */
export async function registrarDecisao(
  supabase: SupabaseClient,
  { perguntaId, indice, userId }: { perguntaId: string; indice: number; userId: number },
): Promise<ResultadoClique> {
  const [{ data: membro, error: erroMembro }, { data: pergunta, error: erroPergunta }] = await Promise.all([
    supabase
      .from("telegram_membros")
      .select("pessoa_id, pessoa:pessoas(nome)")
      .eq("entidade_id", ENTIDADE_FAMILIA)
      .eq("telegram_user_id", userId)
      .eq("ativo", true)
      .not("pessoa_id", "is", null)
      .limit(1)
      .maybeSingle(),
    supabase.from("decisoes_perguntas").select("id, trimestre, numero, opcoes").eq("id", perguntaId).maybeSingle(),
  ]);
  if (erroMembro || erroPergunta) throw new Error(`Decisão: ${(erroMembro ?? erroPergunta)!.message}`);
  if (!membro) return { texto: "Ainda não te conheço por aqui, então não consigo registrar essa decisão.", completou: false, trimestre: null };
  if (!pergunta) return { texto: "Essa pergunta não existe mais.", completou: false, trimestre: null };

  const nome = (membro.pessoa as unknown as { nome: string } | null)?.nome ?? "Você";
  const opcoes = (pergunta.opcoes as string[]) ?? [];
  if (!Number.isInteger(indice) || indice < 0 || indice >= opcoes.length) {
    return { texto: "Não reconheci essa opção.", completou: false, trimestre: null };
  }

  const antes = await lerDecisoes(supabase, pergunta.trimestre);
  if (antes.fechadasEm) {
    return { texto: `${nome}, o balanço deste trimestre já fechou. Essa resposta não entra mais.`, completou: false, trimestre: null };
  }
  const anterior = antes.perguntas.find((p) => p.id === pergunta.id)?.respostas.get(membro.pessoa_id as string);
  if (anterior === indice) {
    return { texto: `${nome}, a sua resposta da pergunta ${pergunta.numero} já estava registrada: ${opcoes[indice]}.`, completou: false, trimestre: null };
  }

  const { error } = await supabase
    .from("decisoes_respostas")
    .upsert(
      { pergunta_id: pergunta.id, pessoa_id: membro.pessoa_id, opcao: indice, respondida_em: new Date().toISOString() },
      { onConflict: "pergunta_id,pessoa_id" },
    );
  if (error) throw new Error(`Decisão: ${error.message}`);

  const depois = await lerDecisoes(supabase, pergunta.trimestre);
  const acao = anterior == null ? "decidiu" : "mudou a resposta";
  const linhas = [`${nome} ${acao} na pergunta ${pergunta.numero}: ${opcoes[indice]}.`];
  // Antes do dia 25 a decisão completa só fica guardada: o balanço tem dia.
  const saiAgora = balancoJaPodeSair(pergunta.trimestre);
  if (depois.completas) {
    linhas.push(
      saiAgora
        ? "As decisões estão completas. O balanço com as decisões de cada um vem em seguida."
        : `As decisões estão completas. O balanço sai no dia ${dataCurta(pergunta.trimestre, 25)}, com elas.`,
    );
  } else {
    const falta = depois.faltam.map((f) => `${f.pessoa.nome} (${f.numeros.join(", ")})`).join(" · ");
    linhas.push(`Falta: ${falta}.`);
  }
  return { texto: linhas.join("\n"), completou: saiAgora && depois.completas && !antes.completas, trimestre: pergunta.trimestre };
}
