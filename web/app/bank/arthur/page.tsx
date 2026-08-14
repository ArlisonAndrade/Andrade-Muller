import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ENTIDADE_ARTHUR } from "@/lib/bank/tipos";
import { moedaBRL } from "@/lib/bank/formato";
import { obterPatrimonioArthur } from "@/lib/bank/arthur";
import {
  FASES_ARTHUR,
  META_FINAL_ARTHUR,
  faseAtual,
  statusDaFase,
  curvaPlanejadaArthur,
} from "@/lib/bank/plano-arthur";
import { CardMetrica } from "@/components/bank/ui/card-metrica";
import { ProgressBar } from "@/components/bank/ui/progress-bar";
import { FaseCard } from "@/components/bank/arthur/fase-card";
import { CurvaArthur } from "@/components/bank/arthur/curva-arthur";
import { IconPigMoney, IconTarget, IconTrendingUp, IconPlus } from "@/components/bank/ui/icones";

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

// Carteira do Arthur — plano fixo em 7 fases (0 a 6), do nascimento até os
// 20 anos, com selo de status por fase. Substitui o simulador de sliders:
// decisão do Arlison em 13/ago/2026, a régua é fixa, não "e se eu mudasse".
export default async function PaginaArthur() {
  const supabase = await createClient();

  const [{ data: cotacoes }, { data: aportes }] = await Promise.all([
    supabase.from("cotacoes_atuais").select("ativo_id, preco_atual"),
    supabase
      .from("transacoes")
      .select("descricao, valor, data")
      .eq("entidade_id", ENTIDADE_ARTHUR)
      .order("data", { ascending: false })
      .limit(8),
  ]);

  const cotacoesMap = new Map((cotacoes ?? []).map((c) => [c.ativo_id, Number(c.preco_atual)]));
  const { atual: patrimonioAtual } = await obterPatrimonioArthur(supabase, cotacoesMap);

  const { anos, meses } = idadeDetalhada();
  const idadeExata = anos + meses / 12;
  const fase = faseAtual(idadeExata);
  const progressoGeral = Math.min(100, (patrimonioAtual / META_FINAL_ARTHUR) * 100);
  const curva = curvaPlanejadaArthur();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>🧒</span> Carteira do Arthur
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Nasceu em 30/10/2022 · hoje com {anos} anos e {meses} {meses === 1 ? "mês" : "meses"} ·
            fase atual: <span className="font-medium text-arthur">{fase.emoji} {fase.nome}</span>
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
          label="Meta aos 20 anos"
          valor={moedaBRL(META_FINAL_ARTHUR)}
          apoio={<>{progressoGeral.toFixed(1)}% do caminho já feito</>}
          icone={<IconTarget size={18} stroke={1.7} />}
        />
        <CardMetrica
          label="Fase atual"
          valor={`${fase.emoji} ${fase.nome}`}
          apoio={<>{fase.idadeInicio} a {fase.idadeFim} anos</>}
          icone={<IconTrendingUp size={18} stroke={1.7} />}
        />
      </div>

      {/* Barra geral do plano */}
      <section className="card-bank p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">🎯 Rumo a {moedaBRL(META_FINAL_ARTHUR)} aos 20 anos</h2>
          <span className="text-sm font-medium text-arthur">{progressoGeral.toFixed(1)}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar percentual={progressoGeral} cor="var(--color-arthur)" altura="h-3" />
        </div>
        <p className="mt-2 text-xs text-text-faint">
          {moedaBRL(patrimonioAtual)} construídos até aqui. Cada real que entra agora ainda tem
          anos pela frente pra render — é o tempo trabalhando a favor dele.
        </p>
      </section>

      {/* Curva planejada */}
      <section className="card-bank p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">📈 A curva do plano</h2>
        <CurvaArthur pontos={curva} />
      </section>

      {/* Fases */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">🗺️ As 7 fases do plano</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FASES_ARTHUR.map((f, i) => {
            const metaAnterior = i > 0 ? FASES_ARTHUR[i - 1].metaFinal : 0;
            const status = statusDaFase(f, idadeExata, patrimonioAtual);
            return (
              <FaseCard
                key={f.numero}
                fase={f}
                status={status}
                patrimonioAtual={patrimonioAtual}
                metaAnterior={metaAnterior}
                ativa={f.numero === fase.numero}
              />
            );
          })}
        </div>
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
