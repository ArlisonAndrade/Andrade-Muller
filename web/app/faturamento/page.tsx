import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { confirmarSugestao, excluirFaturamento } from "@/lib/acoes/faturamento";
import { BotaoExcluir } from "@/components/crm/botao-excluir";
import { nomeCliente, type Cliente } from "@/lib/tipos";
import { moedaBRL, dataBR, mesBR, rotuloTrimestre } from "@/lib/formato";

interface Lancamento {
  id: string;
  cliente_id: string;
  numero_nfse: string | null;
  valor: number;
  competencia: string;
  status: "pendente" | "concluido" | "atrasado";
  data_emissao: string | null;
  arquivo_origem: string | null;
  cliente?: Pick<Cliente, "empresa" | "nome_contato"> | null;
}

const ROTULO_STATUS: Record<string, { texto: string; cor: string }> = {
  concluido: { texto: "Concluído", cor: "text-salvia" },
  pendente: { texto: "Pendente", cor: "text-bronze" },
  atrasado: { texto: "Atrasado", cor: "text-terracota" },
};

export default async function PaginaFaturamento() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const competenciaAtual = `${hoje.slice(0, 7)}-01`;

  const [{ data: lancamentos }, { data: trimestres }, { data: contratos }] =
    await Promise.all([
      supabase
        .from("fm_faturamento")
        .select("*, cliente:fm_clientes(empresa, nome_contato)")
        .order("competencia", { ascending: false })
        .order("created_at"),
      supabase
        .from("fm_faturamento_trimestral")
        .select("*")
        .order("trimestre", { ascending: false })
        .limit(4),
      supabase
        .from("fm_contratos")
        .select("id, cliente_id, valor_mensal, cliente:fm_clientes(empresa, nome_contato)")
        .eq("ativo", true)
        .eq("tipo", "mensal_recorrente"),
    ]);

  const lista = (lancamentos ?? []) as Lancamento[];

  // Sugestão do mês (PRD 1.4): contrato recorrente ativo ainda sem lançamento
  // na competência corrente — ela só confirma.
  const clientesLancadosNoMes = new Set(
    lista.filter((l) => l.competencia === competenciaAtual).map((l) => l.cliente_id),
  );
  const sugestoes = (contratos ?? []).filter(
    (c) => !clientesLancadosNoMes.has(c.cliente_id),
  );

  // Agrupar por competência preservando a ordem (já vem desc)
  const porMes = new Map<string, Lancamento[]>();
  for (const l of lista) {
    const grupo = porMes.get(l.competencia) ?? [];
    grupo.push(l);
    porMes.set(l.competencia, grupo);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Faturamento
          </h1>
          <p className="text-sm text-ink-faint">
            NFS-e emitidas — a emissão continua no portal da prefeitura
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/faturamento/importar"
            className="rounded-lg border border-divider bg-card px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Importar extrato
          </Link>
          <Link
            href="/faturamento/lancar"
            className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            + Lançar NFS-e
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {(trimestres ?? []).map((t) => (
          <div key={t.trimestre} className="rounded-card bg-card p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {rotuloTrimestre(t.trimestre)}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-bronze">
              {moedaBRL(Number(t.faturamento_bruto))}
            </p>
          </div>
        ))}
      </div>

      {sugestoes.length > 0 && (
        <Card title={`Sugestões de ${mesBR(competenciaAtual)}`} className="mb-6">
          <p className="mb-3 text-xs text-ink-faint">
            Contratos recorrentes ainda sem lançamento neste mês — confirme e o
            resto se calcula sozinho.
          </p>
          <div className="flex flex-col gap-2">
            {sugestoes.map((s) => {
              const cliente = s.cliente as unknown as Pick<
                Cliente,
                "empresa" | "nome_contato"
              > | null;
              return (
                <form
                  key={s.id}
                  action={confirmarSugestao}
                  className="flex items-center justify-between gap-3 rounded-lg bg-parchment/60 px-4 py-2.5"
                >
                  <input type="hidden" name="contrato_id" value={s.id} />
                  <input type="hidden" name="cliente_id" value={s.cliente_id} />
                  <input type="hidden" name="valor" value={String(s.valor_mensal ?? 0)} />
                  <input type="hidden" name="competencia" value={competenciaAtual} />
                  <span className="text-sm text-ink">
                    {cliente ? nomeCliente(cliente) : "—"}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-display text-sm font-semibold text-bronze">
                      {moedaBRL(Number(s.valor_mensal ?? 0))}
                    </span>
                    <button
                      type="submit"
                      className="rounded-md bg-salvia px-3 py-1.5 text-xs font-medium text-card hover:opacity-90"
                    >
                      Confirmar lançamento
                    </button>
                  </span>
                </form>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        {porMes.size === 0 && (
          <p className="text-sm text-ink-faint">Nenhum lançamento ainda.</p>
        )}
        {[...porMes.entries()].map(([competencia, doMes]) => {
          const subtotal = doMes.reduce((s, l) => s + Number(l.valor), 0);
          return (
            <div key={competencia} className="mb-6 last:mb-0">
              <div className="mb-2 flex items-baseline justify-between border-b border-divider pb-1.5">
                <h2 className="font-display text-base font-medium capitalize text-ink">
                  {mesBR(competencia)}
                </h2>
                <span className="font-display text-sm font-semibold text-ink-soft">
                  {moedaBRL(subtotal)}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {doMes.map((l) => {
                    const st = ROTULO_STATUS[l.status] ?? {
                      texto: l.status,
                      cor: "",
                    };
                    return (
                      <tr key={l.id} className="border-b border-divider/50 last:border-0">
                        <td className="py-2 pr-3 text-ink">
                          {l.cliente ? nomeCliente(l.cliente) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-xs text-ink-faint">
                          {l.numero_nfse ??
                            (l.arquivo_origem?.startsWith("ofx:")
                              ? "via extrato"
                              : "—")}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-right font-display font-semibold text-ink">
                          {moedaBRL(Number(l.valor))}
                        </td>
                        <td className={`py-2 pr-3 text-xs font-medium ${st.cor}`}>
                          {st.texto}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-xs text-ink-faint">
                          {l.data_emissao ? dataBR(l.data_emissao) : ""}
                        </td>
                        <td className="py-2 text-right text-xs">
                          <BotaoExcluir
                            aoConfirmar={excluirFaturamento.bind(null, l.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
