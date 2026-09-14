import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeSP } from "@/lib/bank/agente/datas";

// Recalcula o agregado de `dividas` a partir das parcelas — fonte única
// de sincronia entre o detalhe e o card da home. Total a pagar cai quando
// uma parcela é adiantada (o juro dela sai da conta).
export async function sincronizarAgregado(supabase: SupabaseClient, dividaId: string) {
  const { data: parcelas } = await supabase
    .from("parcelas_divida")
    .select("valor_parcela, valor_pago_efetivo, paga, adiantada, data_vencimento, numero")
    .eq("divida_id", dividaId);
  if (!parcelas || parcelas.length === 0) return;

  const pagas = parcelas.filter((p) => p.paga);
  const abertas = parcelas.filter((p) => !p.paga).sort((a, b) => a.numero - b.numero);
  const valorPago = pagas.reduce(
    (s, p) => s + Number(p.valor_pago_efetivo ?? p.valor_parcela),
    0,
  );
  const restante = abertas.reduce((s, p) => s + Number(p.valor_parcela), 0);

  await supabase
    .from("dividas")
    .update({
      valor_total: Math.round((valorPago + restante) * 100) / 100,
      valor_pago: Math.round(valorPago * 100) / 100,
      parcelas_total: parcelas.length,
      parcelas_pagas: pagas.length,
      data_vencimento_proxima: abertas[0]?.data_vencimento ?? null,
      quitada: abertas.length === 0,
    })
    .eq("id", dividaId);
}

/**
 * Dívida em débito automático (o Santander é consignado): toda parcela que já
 * venceu é baixada pelo valor cheio, com a data do vencimento. Idempotente —
 * roda no load das telas que mostram dívida e nos resumos do consultor, do
 * mesmo jeito que as recorrências. Não lança transação: o dinheiro sai na
 * folha, antes de o salário cair, e não passa por conta nem cartão.
 *
 * Adiantamento continua manual e não conflita: ele quita parcelas do fim do
 * cronograma, que nunca estão vencidas.
 */
export async function baixarParcelasAutomaticas(supabase: SupabaseClient) {
  const { data: dividas } = await supabase
    .from("dividas")
    .select("id")
    .eq("debito_automatico", true)
    .eq("quitada", false);
  if (!dividas || dividas.length === 0) return;

  const hoje = hojeSP();
  for (const { id } of dividas) {
    const { data: vencidas } = await supabase
      .from("parcelas_divida")
      .select("id, valor_parcela, data_vencimento")
      .eq("divida_id", id)
      .eq("paga", false)
      .lte("data_vencimento", hoje);
    if (!vencidas || vencidas.length === 0) continue;

    for (const p of vencidas) {
      await supabase
        .from("parcelas_divida")
        .update({
          paga: true,
          paga_em: p.data_vencimento,
          adiantada: false,
          valor_pago_efetivo: Number(p.valor_parcela),
        })
        .eq("id", p.id)
        .eq("paga", false);
    }
    await sincronizarAgregado(supabase, id);
  }
}
