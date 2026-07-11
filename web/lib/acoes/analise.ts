"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Análise de reunião por IA (decisão da entrevista de 11/jul/2026):
// a Franciele cola qualquer texto — transcrição bruta ou resumo próprio —
// e recebe ata estruturada + tarefas com prazos + próxima reunião,
// para revisar e confirmar com 1 clique.

export interface AcaoProposta {
  titulo: string;
  responsavel: string;
  prazo: string | null; // "2026-07-20"
  prioridade: "baixa" | "media" | "alta" | "critica";
}

export interface AnaliseProposta {
  resumo_executivo: string;
  decisoes_tomadas: string[];
  proximos_passos: string[];
  acoes: AcaoProposta[];
  proxima_reuniao: { titulo: string; data_hora: string } | null;
  relatorio_analise: string;
}

const SCHEMA_ANALISE = {
  type: "object",
  properties: {
    resumo_executivo: {
      type: "string",
      description: "Resumo executivo da reunião em 1 parágrafo denso",
    },
    decisoes_tomadas: {
      type: "array",
      items: { type: "string" },
      description: "Decisões fechadas na reunião, uma por item",
    },
    proximos_passos: {
      type: "array",
      items: { type: "string" },
      description: "Próximos passos combinados, um por item",
    },
    acoes: {
      type: "array",
      description: "Ações acionáveis extraídas, que virarão tarefas",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          responsavel: {
            type: "string",
            description: "Quem executa (Franciele se não especificado)",
          },
          prazo: {
            anyOf: [
              { type: "string", format: "date", description: "AAAA-MM-DD" },
              { type: "null" },
            ],
          },
          prioridade: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
        },
        required: ["titulo", "responsavel", "prazo", "prioridade"],
        additionalProperties: false,
      },
    },
    proxima_reuniao: {
      anyOf: [
        {
          type: "object",
          properties: {
            titulo: { type: "string" },
            data_hora: {
              type: "string",
              description: "AAAA-MM-DDTHH:MM (se data/hora foi combinada na reunião)",
            },
          },
          required: ["titulo", "data_hora"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
    },
    relatorio_analise: {
      type: "string",
      description:
        "Análise consultiva: contexto identificado, recomendações e riscos, em markdown leve",
    },
  },
  required: [
    "resumo_executivo",
    "decisoes_tomadas",
    "proximos_passos",
    "acoes",
    "proxima_reuniao",
    "relatorio_analise",
  ],
  additionalProperties: false,
} as const;

export async function analisarReuniao(dados: {
  clienteNome: string;
  dataReuniao: string;
  tituloReuniao: string;
  texto: string;
}): Promise<AnaliseProposta> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada no web/.env.local — a análise por IA precisa dela.",
    );
  }

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system:
      "Você é o analista da FM Gestão e Estratégica, consultoria de gestão da Franciele Muller. " +
      "Você recebe o registro de uma reunião com cliente — pode ser transcrição bruta, anotações soltas ou um resumo — " +
      "e produz a ata estruturada no padrão da consultoria: resumo executivo, decisões tomadas, próximos passos, " +
      "ações acionáveis (com responsável, prazo em data absoluta e prioridade) e uma análise consultiva. " +
      "Escreva tudo em português do Brasil. Prazos relativos ('até sexta', 'final do mês') viram datas absolutas " +
      "calculadas a partir da data da reunião. Responsável padrão é Franciele ('Fran'); use os nomes citados no texto quando houver. " +
      "Só liste como ação o que é de fato acionável; não invente decisões ou compromissos que não estão no texto.",
    messages: [
      {
        role: "user",
        content:
          `Cliente: ${dados.clienteNome}\n` +
          `Reunião: ${dados.tituloReuniao}\n` +
          `Data da reunião: ${dados.dataReuniao}\n\n` +
          `Registro da reunião:\n${dados.texto}`,
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: SCHEMA_ANALISE },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("A análise foi recusada pelo modelo. Revise o texto enviado.");
  }

  const bloco = response.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") {
    throw new Error("A análise não retornou conteúdo. Tente novamente.");
  }
  return JSON.parse(bloco.text) as AnaliseProposta;
}

// Revisão confirmada: grava ata + tarefas selecionadas + próxima reunião
export async function confirmarAnalise(dados: {
  reuniaoId: string;
  clienteId: string;
  projetoId: string | null;
  textoOriginal: string;
  analise: Omit<AnaliseProposta, "acoes" | "proxima_reuniao">;
  acoes: AcaoProposta[];
  proximaReuniao: { titulo: string; data_hora: string } | null;
}) {
  const supabase = await createClient();

  const { error: erroReuniao } = await supabase
    .from("fm_reunioes")
    .update({
      status: "realizada",
      texto_original: dados.textoOriginal,
      ata: dados.analise.resumo_executivo,
      decisoes_tomadas: dados.analise.decisoes_tomadas.map((d) => `• ${d}`).join("\n"),
      proximos_passos: dados.analise.proximos_passos.map((p) => `• ${p}`).join("\n"),
      acoes_definidas: dados.acoes.map((a) => `• ${a.titulo} (${a.responsavel})`).join("\n"),
      relatorio_analise: dados.analise.relatorio_analise,
    })
    .eq("id", dados.reuniaoId);
  if (erroReuniao) throw new Error(`Erro ao gravar a ata: ${erroReuniao.message}`);

  if (dados.acoes.length > 0) {
    const { error: erroTarefas } = await supabase.from("fm_tarefas").insert(
      dados.acoes.map((a) => ({
        cliente_id: dados.clienteId,
        reuniao_origem_id: dados.reuniaoId,
        projeto_id: dados.projetoId,
        titulo: a.titulo,
        responsavel: a.responsavel,
        prioridade: a.prioridade,
        data_prazo: a.prazo,
      })),
    );
    if (erroTarefas) throw new Error(`Ata gravada, mas erro ao criar tarefas: ${erroTarefas.message}`);
  }

  if (dados.proximaReuniao) {
    const { error: erroProxima } = await supabase.from("fm_reunioes").insert({
      cliente_id: dados.clienteId,
      projeto_id: dados.projetoId,
      titulo: dados.proximaReuniao.titulo,
      tipo: "acompanhamento",
      status: "agendada",
      data_reuniao: dados.proximaReuniao.data_hora,
    });
    if (erroProxima) throw new Error(`Ata gravada, mas erro ao agendar próxima reunião: ${erroProxima.message}`);
  }

  revalidatePath("/reunioes");
  revalidatePath(`/reunioes/${dados.reuniaoId}`);
  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}
