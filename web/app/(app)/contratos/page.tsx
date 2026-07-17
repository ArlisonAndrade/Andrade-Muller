import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { nomeCliente } from "@/lib/tipos";
import { moedaBRL, dataBR } from "@/lib/formato";
import {
  TIPOS_CONTRATO,
  type Contrato,
} from "@/components/contratos/form-contrato";

// PRD 1.5: alerta automático de renovação N dias antes do fim do contrato
const DIAS_ALERTA_RENOVACAO = 60;

function diasAte(iso: string) {
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  return Math.ceil((alvo - Date.now()) / 86_400_000);
}

function rotuloTipo(tipo: string) {
  return TIPOS_CONTRATO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

function Alerta({ contrato }: { contrato: Contrato }) {
  if (!contrato.ativo || !contrato.data_fim) return null;
  const dias = diasAte(contrato.data_fim);
  if (dias < 0)
    return (
      <span className="rounded-full bg-terracota/15 px-2 py-0.5 text-[11px] font-medium text-terracota">
        vencido há {-dias} dias
      </span>
    );
  if (dias <= DIAS_ALERTA_RENOVACAO)
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
          dias <= 30 ? "bg-terracota/15 text-terracota" : "bg-bronze/15 text-bronze"
        }`}
      >
        renova em {dias} dias
      </span>
    );
  return null;
}

export default async function PaginaContratos() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fm_contratos")
    .select("*, cliente:fm_clientes(empresa, nome_contato)")
    .order("ativo", { ascending: false })
    .order("data_inicio", { ascending: false });

  const contratos = (data ?? []) as Contrato[];
  const ativos = contratos.filter((c) => c.ativo);
  const encerrados = contratos.filter((c) => !c.ativo);
  const receitaRecorrente = ativos
    .filter((c) => c.tipo === "mensal_recorrente")
    .reduce((s, c) => s + Number(c.valor_mensal ?? 0), 0);

  const Linha = ({ c }: { c: Contrato }) => (
    <div className="flex items-center gap-3 border-b border-divider/50 py-3 last:border-0">
      <div className="flex-1">
        <Link
          href={`/contratos/${c.id}`}
          className={`text-sm font-medium hover:text-marinho ${c.ativo ? "text-ink" : "text-ink-faint"}`}
        >
          {c.cliente ? nomeCliente(c.cliente) : "—"}
        </Link>
        <p className="text-xs text-ink-faint">
          {rotuloTipo(c.tipo)} · {dataBR(c.data_inicio)}
          {c.data_fim ? ` → ${dataBR(c.data_fim)}` : " → sem fim definido"}
        </p>
      </div>
      <Alerta contrato={c} />
      <div className="w-32 text-right">
        {c.valor_mensal != null && (
          <p className="font-display text-sm font-semibold text-ink">
            {moedaBRL(Number(c.valor_mensal))}/mês
          </p>
        )}
        {c.valor_total_contrato != null && (
          <p className="text-xs text-ink-faint">
            total {moedaBRL(Number(c.valor_total_contrato))}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Contratos
          </h1>
          <p className="text-sm text-ink-faint">
            Receita recorrente ativa:{" "}
            <span className="font-medium text-bronze">
              {moedaBRL(receitaRecorrente)}/mês
            </span>
          </p>
        </div>
        <Link
          href="/contratos/novo"
          className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
        >
          + Novo contrato
        </Link>
      </div>

      <Card title={`Ativos · ${ativos.length}`}>
        {ativos.length === 0 && (
          <p className="text-sm text-ink-faint">Nenhum contrato ativo.</p>
        )}
        {ativos.map((c) => (
          <Linha key={c.id} c={c} />
        ))}
      </Card>

      {encerrados.length > 0 && (
        <Card title={`Encerrados · ${encerrados.length}`} className="mt-6">
          {encerrados.map((c) => (
            <Linha key={c.id} c={c} />
          ))}
        </Card>
      )}
    </div>
  );
}
