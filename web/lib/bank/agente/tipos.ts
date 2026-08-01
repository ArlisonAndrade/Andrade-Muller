import type { FormaPagamento, GrupoOrcamento } from "@/lib/bank/tipos";

// ---------- Identidade de quem falou ----------
export type MembroTelegram = {
  id: string;
  entidade_id: string;
  telegram_chat_id: number;
  telegram_user_id: number;
  pessoa_id: string | null;
  nome_telegram: string | null;
  pessoa_nome: string | null;
};

// ---------- Snapshot que vai no prompt ----------
// Regra do agente: TODO número que ele cita sai daqui. Ele nunca calcula
// saldo de cabeça — se não está no contexto, ele não fala.
export type ContextoAgente = {
  hoje: string;
  entidadeId: string;
  pessoa: { id: string; nome: string } | null;
  categorias: {
    id: string;
    nome: string;
    grupo_orcamento: GrupoOrcamento | null;
    tipo: "receita" | "despesa";
    /** false = conta fixa, parcela ou aporte: fica fora do total da semana. */
    conta_na_semana: boolean;
  }[];
  cartoes: { id: string; nome: string; titular: string | null }[];
  semana: {
    inicio: string;
    fim: string;
    meta: number | null;
    gasto: number;
    diasRestantes: number;
    diasDecorridos: number;
    /** Onde a semana fecha se o ritmo continuar — o gancho do "segura a pizza". */
    projecao: number | null;
    porCategoria: {
      nome: string;
      gasto: number;
      /** Fatia planejada da meta, em reais. */
      alvo: number | null;
      /** Média dessa categoria nas semanas fechadas — o "normal" dela. */
      media: number | null;
    }[];
    porDia: { diaSemana: string; total: number }[];
    porPessoa: { nome: string; total: number }[];
  };
  /** A régua do "mais que o normal". Vazio enquanto não houver semana fechada. */
  historico: {
    mediaSemanal: number | null;
    /** Semanas fechadas seguidas dentro da meta. */
    streak: number;
    semanas: { inicio: string; gasto: number; meta: number | null }[];
  };
  mes: {
    inicio: string;
    gasto: number;
    porGrupo: Record<Exclude<GrupoOrcamento, "nao_aplica">, number>;
  };
  ultimos: {
    descricao: string;
    valor: number;
    data: string;
    categoria: string | null;
  }[];
};

// ---------- Saída estruturada da IA ----------
export type LancamentoProposto = {
  descricao: string;
  valor: number;
  categoria_id: string | null;
  forma_pagamento: FormaPagamento | null;
  cartao_id: string | null;
  data: string;
  confianca: "alta" | "baixa";
};

export type Interpretacao = {
  acao: "lancar" | "responder" | "ignorar";
  lancamentos: LancamentoProposto[];
  resposta: string;
};

// ---------- Resultado do processamento de uma mensagem ----------
export type ResultadoAgente = {
  responder: boolean;
  texto: string;
  /** id em agente_mensagens — vira o callback_data do botão "desfazer". */
  desfazerToken: string | null;
  /**
   * Quando a categoria foi chute, o lançamento sai com botões das 6 opções
   * em vez de morrer em "Outro". Um toque corrige — sem abrir o site.
   */
  escolhaCategoria?: {
    transacaoId: string;
    /** `indice` e não o uuid da categoria: callback_data do Telegram tem 64
     *  bytes e dois uuids não cabem. A ordem é resolvida no servidor. */
    opcoes: { indice: number; nome: string }[];
  } | null;
};
