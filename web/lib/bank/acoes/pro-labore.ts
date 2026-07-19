"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_FAMILIA, ENTIDADE_CONSULTORIA } from "@/lib/bank/tipos";

// Categorias/conta reais já existentes na entidade consultoria (06_financeiro_base.sql
// do FM Gestão) — o lançamento do lado CNPJ entra na mesma DRE/Fator R, não avulso.
const CONTA_NUBANK_PJ = "f2000000-0000-0000-0000-000000000001";
const CATEGORIA_PRO_LABORE_BRUTO = "ca000000-0000-0000-0000-000000000041";
const CATEGORIA_PAGAMENTO_DIVIDENDOS = "ca000000-0000-0000-0000-000000000072";

// Lança 1x no CNPJ (na mesma DRE do FM Gestão) e espelha automaticamente
// na Família via transacao_vinculada_id nos dois sentidos — sem lançar 2x na mão.
export async function transferirProLabore(formData: FormData) {
  const supabase = await createClient();

  const tipo = String(formData.get("tipo")); // 'pro_labore_franciele' | 'dividendos_franciele'
  const valor = Number(formData.get("valor"));
  const data = String(formData.get("data"));
  const ehDividendo = tipo === "dividendos_franciele";
  const rotulo = ehDividendo ? "Dividendos" : "Pró-labore";

  const { data: categoriaFamilia } = await supabase
    .from("categorias")
    .select("id")
    .eq("entidade_id", ENTIDADE_FAMILIA)
    .eq("nome", "Pró-labore/Dividendos Franciele")
    .maybeSingle();

  const { data: origemCnpj } = await supabase
    .from("transacoes")
    .insert({
      entidade_id: ENTIDADE_CONSULTORIA,
      conta_id: CONTA_NUBANK_PJ,
      categoria_id: ehDividendo ? CATEGORIA_PAGAMENTO_DIVIDENDOS : CATEGORIA_PRO_LABORE_BRUTO,
      descricao: `${rotulo} distribuído — Franciele`,
      valor,
      data,
    })
    .select("id")
    .single();

  const { data: destinoFamilia } = await supabase
    .from("transacoes")
    .insert({
      entidade_id: ENTIDADE_FAMILIA,
      categoria_id: categoriaFamilia?.id ?? null,
      descricao: `${rotulo} recebido — Franciele`,
      valor,
      data,
      transacao_vinculada_id: origemCnpj?.id,
    })
    .select("id")
    .single();

  if (origemCnpj?.id && destinoFamilia?.id) {
    await supabase
      .from("transacoes")
      .update({ transacao_vinculada_id: destinoFamilia.id })
      .eq("id", origemCnpj.id);

    // Ignora conflito de unique(entidade, competencia, tipo) se já houver lançamento no mês.
    await supabase.from("renda_mensal").insert({
      entidade_id: ENTIDADE_FAMILIA,
      competencia: `${data.slice(0, 7)}-01`,
      tipo,
      valor,
      data_recebimento: data,
      transacao_id: destinoFamilia.id,
      confirmado: true,
    });
  }

  redirect("/bank");
}
