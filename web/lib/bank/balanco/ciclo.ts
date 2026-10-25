import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { ENTIDADE_FAMILIA } from "@/lib/bank/tipos";
import { DOUTRINA_ARKAD } from "@/lib/bank/agente/arkad";
import { dataCurta } from "@/lib/bank/balanco/calendario";
import { montarBalanco, type DadosBalanco } from "@/lib/bank/balanco/dados";
import { lerDecisoes } from "@/lib/bank/balanco/decisoes";
import {
  chatDoGrupo,
  enviarPerguntasNoGrupo,
  fecharDecisoes,
  garantirLinhaDoBalanco,
  mensagemSemReuniao,
  postarNoGrupo,
} from "@/lib/bank/balanco/gerar";

// O ciclo trimestral do Arkad (decisão do Arlison, 25/out/2026 — a reunião
// "nunca dá tempo", então o grupo cobra). Só no mês seguinte ao fechamento do
// trimestre (jan, abr, jul, out), às 9h:
//
//   dia 5  · convoca a reunião (resumo, importância, um ensinamento do livro,
//            botão "Já fizemos") e manda as decisões com botões, uma resposta
//            por pessoa
//   dia 15 · só se a reunião não foi feita: cobra de novo, mais firme, pelo
//            nome de quem falta decidir, e reenvia as perguntas pendentes
//   dia 25 · sem reunião, o custo de não ter sentado à mesa; decisões
//            completas (ou reunião feita) → o balanço sai; faltando decisão →
//            cobrança individual e o balanço sai quando o último responder
//            ou às 21h, com o que houver
//
// Os agendamentos ficam no n8n (workflow "Decisões do trimestre"); aqui só a
// regra. Reunião feita = linha em reunioes_trimestrais (compromissos no Modo
// TV ou o botão "Já fizemos").

const siglaDe = (trimestre: string) => `${trimestre.slice(-1)}T${trimestre.slice(2, 4)}`;
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// ---------- O livro: um ensinamento pelo ponto fraco do trimestre ----------
// Paráfrases das curas de "O Homem Mais Rico da Babilônia" (a mesma doutrina
// de lib/bank/agente/arkad.ts), nunca trecho literal — tradução tem direito
// autoral. Duas versões: a convocação (dia 5) e a cobrança (dia 15).

type Ensinamento = { dia5: string; dia15: string };

const aporteAbaixo = (d: DadosBalanco) => d.numeros.planejado > 0 && d.numeros.aportado < d.numeros.planejado - 1;

const ENSINAMENTOS: Record<"primeira" | "segunda" | "terceira" | "quarta", Ensinamento> = {
  primeira: {
    dia5: "Em <i>O Homem Mais Rico da Babilônia</i>, a primeira cura para a bolsa vazia é separar para si uma parte de tudo o que se ganha, antes de pagar qualquer outra coisa. Aporte que sai da reserva não cumpre essa cura: só muda o dinheiro de lugar.",
    dia15: "Arkad ensinava que a parte guardada vem primeiro, e não do que sobra no fim do mês. Quem espera sobrar nunca guarda.",
  },
  segunda: {
    dia5: "Em <i>O Homem Mais Rico da Babilônia</i>, a segunda das sete curas é controlar os gastos: o que a gente chama de necessidade cresce até ocupar toda a renda, se ninguém olhar para ele. A reunião é o momento de olhar.",
    dia15: "No livro, o gasto que ninguém governa acaba governando a casa. Separar necessidade de desejo é trabalho de duas pessoas, à mesa.",
  },
  terceira: {
    dia5: "A terceira cura do livro é fazer o ouro trabalhar: cada moeda guardada deve trazer outras. O trimestre mostrou isso acontecendo. A reunião serve para decidir o próximo passo, não para apagar incêndio.",
    dia15: "No livro, o ouro trabalha para quem lhe dá direção. Vocês têm o plano. Falta decidir juntos o próximo passo.",
  },
  quarta: {
    dia5: "A quarta cura do livro é proteger o tesouro contra a perda: antes de buscar retorno, garantir que o principal está seguro. A reserva é esse tesouro.",
    dia15: "Arkad dizia que o primeiro cuidado de quem tem ouro é não perdê-lo. Reserva que se gasta aos poucos é ouro que se perde sem ninguém ver.",
  },
};

function ensinamentoDo(d: DadosBalanco): Ensinamento {
  if (d.numeros.retiradas > 0) return ENSINAMENTOS.primeira;
  if (d.semanas.total > 0 && d.semanas.dentro / d.semanas.total < 0.5) return ENSINAMENTOS.segunda;
  if (d.numeros.metaReserva > 0 && d.numeros.reserva < d.numeros.metaReserva * 0.66) return ENSINAMENTOS.quarta;
  if (aporteAbaixo(d)) return ENSINAMENTOS.primeira;
  return ENSINAMENTOS.terceira;
}

/** O trimestre em duas frases: o que foi bem e o que precisa de conversa. */
function resumoDoTrimestre(d: DadosBalanco): string {
  const bom: string[] = [];
  if (d.numeros.cresceuSemRetiradas != null && d.numeros.cresceuSemRetiradas > 0) {
    bom.push(`a carteira cresceu ${reais(d.numeros.cresceuSemRetiradas)}`);
  }
  if (d.numeros.parcelasPagas > 0) bom.push("as parcelas do Santander foram pagas em dia");
  const conversa: string[] = [];
  if (d.semanas.total > 0 && d.semanas.dentro / d.semanas.total < 0.5) {
    conversa.push(`a semana passou da meta em ${d.semanas.total - d.semanas.dentro} de ${d.semanas.total} semanas`);
  }
  if (d.numeros.retiradas > 0) conversa.push("o aporte saiu da reserva");
  if (aporteAbaixo(d)) conversa.push("o aporte ficou abaixo do plano");

  const frases: string[] = [];
  if (bom.length) frases.push(`Em três meses ${bom.join(" e ")}.`);
  if (conversa.length) {
    frases.push(`${bom.length ? "Mas " : ""}${conversa.join(", e ")}. É isso que precisa ser conversado à mesa, não no grupo.`);
  } else {
    frases.push("É hora de decidir juntos o próximo passo.");
  }
  return frases.join(" ");
}

/** Dia 5: a convocação da reunião. */
function textoConvocacao(d: DadosBalanco, trimestre: string) {
  return [
    `<b>Família, o ${trimestre.slice(-1)}º trimestre fechou, e a reunião de vocês tem que acontecer até o dia ${dataCurta(trimestre, 15)}.</b>`,
    resumoDoTrimestre(d),
    ensinamentoDo(d).dia5,
    "Trinta minutos. Abram o Modo TV e registrem no fim o que combinarem. Se conversarem sem o Modo TV, toquem no botão aqui embaixo.",
  ].join("\n\n");
}

/** Dia 15: a cobrança da reunião que não aconteceu. */
function textoCobrancaReuniao(d: DadosBalanco, trimestre: string) {
  return [
    `<b>Família, a reunião do ${siglaDe(trimestre)} ainda não aconteceu.</b>`,
    `O balanço sai no dia ${dataCurta(trimestre, 25)} de qualquer jeito. Sem a reunião, as decisões ficam só nos botões, e a conversa que dá sentido a elas não acontece.`,
    ensinamentoDo(d).dia15,
    "Ainda dá tempo: 10 dias.",
  ].join("\n\n");
}

/** Mensagem com o botão "Já fizemos a reunião" (callback reu:<trimestre>). */
async function mandarComBotaoReuniao(chatId: number, mensagem: string, trimestre: string) {
  await postarNoGrupo(
    {
      tipo: "pergunta",
      chat_id: String(chatId),
      mensagem,
      teclado: JSON.stringify({
        rows: [{ row: { buttons: [{ text: "✅ Já fizemos a reunião", additionalFields: { callback_data: `reu:${trimestre}` } }] } }],
      }),
    },
    "a convocação",
  );
}

// ---------- Perguntas: se ninguém escreveu as do trimestre, o Arkad escreve ----------

const SCHEMA_PERGUNTAS = {
  type: "object",
  properties: {
    perguntas: {
      type: "array",
      items: {
        type: "object",
        properties: { texto: { type: "string" }, opcoes: { type: "array", items: { type: "string" } } },
        required: ["texto", "opcoes"],
        additionalProperties: false,
      },
    },
  },
  required: ["perguntas"],
  additionalProperties: false,
} as const;

const PERSONA_PERGUNTAS = `Você é o Arkad, conselheiro financeiro da Casa Andrade Muller (Arlison e Franciele, pais do Arthur). O trimestre fechou e a família não costuma conseguir se reunir; as decisões que sairiam da reunião viram perguntas no grupo do Telegram, com botões, e cada um responde por si.

Escreva EXATAMENTE 3 perguntas de decisão para o próximo trimestre, a partir dos DADOS. Cada pergunta:
- nasce de um ponto do trimestre que pede decisão (o que ajustar, o aporte, a reserva, a semana, a dívida, uma data que vem aí como o 13º);
- é concreta e cabe numa linha (no máximo 110 caracteres), em português do Brasil;
- tem 3 ou 4 opções curtas (no máximo 38 caracteres cada), mutuamente exclusivas, que a família consiga cumprir e que dê para conferir no trimestre seguinte;
- não recomenda investimento específico (ação, fundo, cripto);
- só cita número que esteja nos DADOS.
A família definiu a ordem do dinheiro extra: reserva, depois adiantar o Santander, depois renda variável. O aporte do plano é fixo e não se negocia (pode-se discutir de onde ele sai, não se pula).
${DOUTRINA_ARKAD}`;

async function garantirPerguntas(supabase: SupabaseClient, trimestre: string, d: DadosBalanco): Promise<boolean> {
  const existentes = await lerDecisoes(supabase, trimestre);
  if (existentes.perguntas.length > 0) return true;
  try {
    const anthropic = new Anthropic();
    const resposta = await anthropic.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 3000,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_PERGUNTAS } },
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      system: PERSONA_PERGUNTAS,
      messages: [{ role: "user", content: `DADOS DO ${d.sigla}:\n${JSON.stringify({ ...d, parecer: undefined }, null, 2)}\n\nEscreva as 3 perguntas.` }],
    });
    const bloco = resposta.content.find((b) => b.type === "text");
    if (resposta.stop_reason === "refusal" || !bloco || bloco.type !== "text") return false;
    const { perguntas } = JSON.parse(bloco.text) as { perguntas: Array<{ texto: string; opcoes: string[] }> };
    const validas = perguntas
      .map((p) => ({ texto: p.texto.trim(), opcoes: p.opcoes.map((o) => o.trim()).filter(Boolean).slice(0, 4) }))
      .filter((p) => p.texto && p.opcoes.length >= 3)
      .slice(0, 3);
    if (validas.length === 0) return false;
    const { error } = await supabase.from("decisoes_perguntas").insert(
      validas.map((p, i) => ({ entidade_id: ENTIDADE_FAMILIA, trimestre, numero: i + 1, texto: p.texto, opcoes: p.opcoes })),
    );
    if (error) throw new Error(error.message);
    return true;
  } catch (erro) {
    console.error("[ciclo] perguntas", erro);
    return false;
  }
}

async function reuniaoFeita(supabase: SupabaseClient, trimestre: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("reunioes_trimestrais")
    .select("id")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("trimestre", trimestre)
    .maybeSingle();
  if (error) throw new Error(`Reunião: ${error.message}`);
  return data != null;
}

// ---------- Os três dias ----------

export type ResultadoDia = { dia: 5 | 15 | 25; trimestre: string; feito: string[] };

export async function rodarDia5(supabase: SupabaseClient, trimestre: string): Promise<ResultadoDia> {
  const feito: string[] = [];
  const [d, chatId] = await Promise.all([montarBalanco(supabase, trimestre, { parecer: false }), chatDoGrupo(supabase)]);
  await garantirLinhaDoBalanco(supabase, trimestre);

  if (!(await reuniaoFeita(supabase, trimestre))) {
    await mandarComBotaoReuniao(chatId, textoConvocacao(d, trimestre), trimestre);
    feito.push("convocação");
  }

  if (await garantirPerguntas(supabase, trimestre, d)) {
    await enviarPerguntasNoGrupo(supabase, trimestre, {
      prazo: `dia ${dataCurta(trimestre, 25)}`,
      titulo: `E para o balanço do dia ${dataCurta(trimestre, 25)}, preciso das decisões de cada um.`,
    });
    feito.push("perguntas");
  } else {
    feito.push("sem perguntas (o modelo não conseguiu escrever)");
  }
  return { dia: 5, trimestre, feito };
}

export async function rodarDia15(supabase: SupabaseClient, trimestre: string): Promise<ResultadoDia> {
  const feito: string[] = [];
  if (await reuniaoFeita(supabase, trimestre)) return { dia: 15, trimestre, feito: ["reunião feita: nada a cobrar"] };

  const [d, chatId] = await Promise.all([montarBalanco(supabase, trimestre, { parecer: false }), chatDoGrupo(supabase)]);
  await mandarComBotaoReuniao(chatId, textoCobrancaReuniao(d, trimestre), trimestre);
  feito.push("cobrança da reunião");

  const estado = await lerDecisoes(supabase, trimestre);
  if (estado.perguntas.length > 0 && !estado.completas && !estado.fechadasEm) {
    await enviarPerguntasNoGrupo(supabase, trimestre, {
      prazo: `dia ${dataCurta(trimestre, 25)}`,
      titulo: "E as decisões ainda não estão completas.",
      somentePendentes: true,
    });
    feito.push("perguntas pendentes");
  }
  return { dia: 15, trimestre, feito };
}

export async function rodarDia25(supabase: SupabaseClient, trimestre: string): Promise<ResultadoDia> {
  const feito: string[] = [];
  const feita = await reuniaoFeita(supabase, trimestre);
  const estado = await lerDecisoes(supabase, trimestre);
  if (estado.fechadasEm) return { dia: 25, trimestre, feito: ["balanço já fechado"] };

  if (!feita) {
    const [d, chatId] = await Promise.all([montarBalanco(supabase, trimestre, { parecer: false }), chatDoGrupo(supabase)]);
    const mensagem = mensagemSemReuniao(d);
    if (mensagem) {
      await postarNoGrupo({ tipo: "mensagem", chat_id: String(chatId), mensagem }, "a mensagem do dia 25");
      feito.push("custo de não ter feito a reunião");
    }
  }

  // Reunião feita, sem perguntas, ou decisões completas: o balanço sai agora.
  if (feita || estado.perguntas.length === 0 || estado.completas) {
    await fecharDecisoes(supabase, trimestre, { forcar: true });
    feito.push("balanço enviado");
    return { dia: 25, trimestre, feito };
  }

  // Faltando decisão: cobrança pelo nome, e o balanço sai quando o último
  // responder ou às 21h (prazo, no mesmo workflow).
  await enviarPerguntasNoGrupo(supabase, trimestre, {
    prazo: "hoje, às 21h",
    titulo: "Antes do balanço, faltam decisões.",
    somentePendentes: true,
  });
  feito.push("cobrança das decisões (balanço quando completar ou às 21h)");
  return { dia: 25, trimestre, feito };
}

/** Clique em "Já fizemos a reunião". */
export async function marcarReuniaoFeita(supabase: SupabaseClient, trimestre: string, userId: number) {
  const { data: membro } = await supabase
    .from("telegram_membros")
    .select("pessoa:pessoas(nome)")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("telegram_user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();
  const nome = (membro?.pessoa as unknown as { nome: string } | null)?.nome;
  if (!nome) return "Ainda não te conheço por aqui, então não consigo registrar a reunião.";
  if (!/^\d{4}-T[1-4]$/.test(trimestre)) return "Não reconheci esse trimestre.";

  const ja = await reuniaoFeita(supabase, trimestre);
  if (!ja) {
    const { error } = await supabase.from("reunioes_trimestrais").insert({
      entidade_id: ENTIDADE_FAMILIA,
      trimestre,
      compromissos: [],
      notas: `Marcada como feita no Telegram por ${nome}.`,
    });
    if (error) throw new Error(`Reunião: ${error.message}`);
  }
  return ja
    ? `${nome}, a reunião do ${siglaDe(trimestre)} já estava registrada.`
    : `Anotado, ${nome}: a reunião do ${siglaDe(trimestre)} foi feita. Registrem os combinados no Modo TV, que eles entram no balanço do dia ${dataCurta(trimestre, 25)}.`;
}


/** Os textos dos dias 5 e 15 de um trimestre, sem mandar nada (pra conferir). */
export async function previaDoCiclo(supabase: SupabaseClient, trimestre: string) {
  const d = await montarBalanco(supabase, trimestre, { parecer: false });
  return { dia5: textoConvocacao(d, trimestre), dia15: textoCobrancaReuniao(d, trimestre) };
}
