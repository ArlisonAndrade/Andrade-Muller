"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularSaude, segundaDaSemana } from "@/lib/saude";
import { ENTIDADE_ID } from "@/lib/tipos";

// Grava (ou atualiza) o snapshot da semana em fm_checklist_saude.
// Os booleanos são calculados na hora, das mesmas regras do radar.
export async function registrarSemana() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const competenciaAtual = `${hoje.slice(0, 7)}-01`;

  const [clientes, negocios, tarefas, reunioes, contratos, faturamento] =
    await Promise.all([
      supabase.from("fm_clientes").select("id, empresa, nome_contato, status, ultimo_contato"),
      supabase.from("fm_negocios").select("estagio, proxima_acao, nome_negocio"),
      supabase.from("fm_tarefas").select("concluida, prioridade, responsavel, titulo"),
      supabase.from("fm_reunioes").select("status, ata, titulo"),
      supabase.from("fm_contratos").select("cliente_id, tipo").eq("ativo", true),
      supabase.from("fm_faturamento").select("competencia, cliente_id"),
    ]);

  const indicadores = calcularSaude({
    clientes: clientes.data ?? [],
    negocios: negocios.data ?? [],
    tarefas: tarefas.data ?? [],
    reunioes: reunioes.data ?? [],
    contratos: contratos.data ?? [],
    faturamento: faturamento.data ?? [],
    competenciaAtual,
  });

  const semana = segundaDaSemana();
  const colunas = Object.fromEntries(indicadores.map((i) => [i.chave, i.ok]));

  const { data: existente } = await supabase
    .from("fm_checklist_saude")
    .select("id")
    .eq("semana_referencia", semana)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("fm_checklist_saude").update(colunas).eq("id", existente.id)
    : await supabase.from("fm_checklist_saude").insert({
        entidade_id: ENTIDADE_ID,
        semana_referencia: semana,
        ...colunas,
      });

  if (error) throw new Error(`Erro ao registrar semana: ${error.message}`);
  revalidatePath("/saude");
}
