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
  }[];
  cartoes: { id: string; nome: string; titular: string | null }[];
  semana: {
    inicio: string;
    fim: string;
    meta: number | null;
    gasto: number;
    diasRestantes: number;
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
};
