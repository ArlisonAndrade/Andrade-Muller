import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_ARTHUR } from "@/lib/bank/tipos";
import { moedaBRL } from "@/lib/bank/formato";
import { patrimonio } from "@/lib/bank/calculos";
import { CardMetrica } from "@/components/bank/ui/card-metrica";
import { SimuladorArthur } from "@/components/bank/plano/simulador-arthur";
import { IconPigMoney, IconCalendarEvent, IconTarget, IconPlus } from "@/components/bank/ui/icones";
import type { Transacao } from "@/lib/bank/tipos";

export const metadata = { title: "Carteira Arthur" };

const NASCIMENTO = new Date("2022-10-30");

function idadeDetalhada() {
  const hoje = new Date();
  let anos = hoje.getFullYear() - NASCIMENTO.getFullYear();
  let meses = hoje.getMonth() - NASCIMENTO.getMonth();
  if (hoje.getDate() < NASCIMENTO.getDate()) meses--;
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  return { anos, meses };
}

// Carteira do Arthur — patrimônio atual + plano do nascimento (30/10/2022)
// até a idade-alvo, com aportes de aniversário e projeção interativa.
export default async function PaginaArthur() {
  const supabase = await createClient();

  const [
    { data: contas },
    { data: transacoes },
    { data: posicoes },
    { data: cotacoes },
    { data: parametros },
    { data: aportes },
  ] = await Promise.all([
    supabase.from("contas").select("id, saldo_inicial").eq("entidade_id", ENTIDADE_ARTHUR),
    supabase
      .from("transacoes")
      .select("valor, categoria:categorias(tipo)")
      .eq("entidade_id", ENTIDADE_ARTHUR),
    supabase.from("posicao_ativos").select("*").eq("entidade_id", ENTIDADE_ARTHUR),
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual"),
    supabase.from("parametros_plano").select("chave, valor").eq("entidade_id", ENTIDADE_ARTHUR),
    supabase
      .from("transacoes")
      .select("descricao, valor, data")
      .eq("entidade_id", ENTIDADE_ARTHUR)
      .order("data", { ascending: false })
      .limit(8),
  ]);

  const cotacoesMap = new Map((cotacoes ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]));
  const patrimonioAtual = patrimonio(
    contas ?? [],
    (transacoes ?? []) as unknown as Transacao[],
    posicoes ?? [],
    cotacoesMap,
  );

  const params = new Map((parametros ?? []).map((p) => [p.chave, Number(p.valor)]));
  const aporteMensal = params.get("arthur_aporte_mensal") ?? 100;
  const aporteAniversario = params.get("arthur_aporte_aniversario") ?? 500;
  const rentabilidade = params.get("arthur_rentabilidade_aa") ?? 10;
  const idadeAlvo = params.get("arthur_idade_alvo") ?? 18;

  const { anos, meses } = idadeDetalhada();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Carteira do Arthur</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Nasceu em 30/10/2022 · hoje com {anos} anos e {meses} {meses === 1 ? "mês" : "meses"}.
            Cada aporte de hoje tem ~{idadeAlvo - anos} anos pra render.
          </p>
        </div>
        <Link
          href="/bank/investimentos/novo"
          className="flex items-center gap-1.5 rounded-[8px] bg-arthur px-3 py-2 text-sm font-medium text-white"
        >
          <IconPlus size={16} stroke={2} /> Novo aporte
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardMetrica
          label="Patrimônio hoje"
          valor={moedaBRL(patrimonioAtual)}
          corValor="text-arthur"
          icone={<IconPigMoney size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Aporte planejado"
          valor={moedaBRL(aporteMensal)}
          apoio={<>por mês + {moedaBRL(aporteAniversario)} no aniversário</>}
          icone={<IconCalendarEvent size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Meta"
          valor={`${idadeAlvo} anos`}
          apoio={<>faltam {idadeAlvo - anos} anos</>}
          icone={<IconTarget size={18} stroke={1.7} />}
        />
      </div>

      <section className="card-bank p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-semibold">Plano até a maioridade</h2>
        <p className="mb-4 text-xs text-text-faint">
          Ajuste os aportes e veja quanto o Arthur terá — cada aniversário
          recebe o aporte extra e todo o montante segue rendendo.
        </p>
        <SimuladorArthur
          entidadeId={ENTIDADE_ARTHUR}
          patrimonioAtual={patrimonioAtual}
          aporteMensalInicial={aporteMensal}
          aporteAniversarioInicial={aporteAniversario}
          rentabilidadeInicial={rentabilidade}
          idadeAlvoInicial={idadeAlvo}
        />
      </section>

      {(aportes ?? []).length > 0 && (
        <section className="card-bank p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold">Movimentações recentes</h2>
          <div className="flex flex-col gap-2.5">
            {(aportes ?? []).map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{a.descricao}</p>
                  <p className="text-xs text-text-faint">
                    {new Date(`${a.data}T12:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-arthur">
                  + {moedaBRL(Number(a.valor))}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
