import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_CLIENTE,
  ESTAGIOS_NEGOCIO,
  nomeCliente,
  type Cliente,
  type Negocio,
} from "@/lib/tipos";
import { moedaBRL, dataBR, diasDesde } from "@/lib/formato";
import { mudarStatusCliente, mudarEstagioNegocio } from "@/lib/acoes/crm";
import { SeletorKanban } from "@/components/crm/seletor-kanban";

// Regra do PRD 1.1: lead sem próximo contato há X dias vira alerta automático.
const DIAS_SEM_CONTATO = 14;
const STATUS_PIPELINE = ["lead", "prospeccao", "proposta", "negociacao"];

function alertaContato(c: Cliente): string | null {
  if (!STATUS_PIPELINE.includes(c.status)) return null;
  if (!c.ultimo_contato) return "sem contato registrado";
  const dias = diasDesde(c.ultimo_contato);
  return dias >= DIAS_SEM_CONTATO ? `sem contato há ${dias} dias` : null;
}

function CartaoCliente({ cliente }: { cliente: Cliente }) {
  const alerta = alertaContato(cliente);
  return (
    <div className="rounded-card bg-card p-3 shadow-card">
      <Link
        href={`/crm/clientes/${cliente.id}`}
        className="block text-sm font-medium text-ink hover:text-marinho"
      >
        {nomeCliente(cliente)}
      </Link>
      {cliente.empresa && (
        <p className="text-xs text-ink-faint">{cliente.nome_contato}</p>
      )}
      {alerta ? (
        <p className="mt-1 text-xs font-medium text-terracota">⚠ {alerta}</p>
      ) : (
        cliente.ultimo_contato && (
          <p className="mt-1 text-xs text-ink-faint">
            último contato {dataBR(cliente.ultimo_contato)}
          </p>
        )
      )}
      <SeletorKanban
        valor={cliente.status}
        opcoes={STATUS_CLIENTE}
        aoMudar={mudarStatusCliente.bind(null, cliente.id)}
      />
    </div>
  );
}

function CartaoNegocio({ negocio }: { negocio: Negocio }) {
  const emPipeline = !["fechado", "fechado_perdido"].includes(negocio.estagio);
  return (
    <div className="rounded-card bg-card p-3 shadow-card">
      <Link
        href={`/crm/negocios/${negocio.id}`}
        className="block text-sm font-medium text-ink hover:text-marinho"
      >
        {negocio.nome_negocio}
      </Link>
      {negocio.cliente && (
        <p className="text-xs text-ink-faint">{nomeCliente(negocio.cliente)}</p>
      )}
      <p className="mt-1 font-display text-base font-semibold text-bronze">
        {moedaBRL(negocio.valor)}
      </p>
      {emPipeline &&
        (negocio.proxima_acao ? (
          <p className="mt-1 text-xs text-ink-soft">
            → {negocio.proxima_acao}
            {negocio.proxima_acao_data &&
              ` · ${dataBR(negocio.proxima_acao_data)}`}
          </p>
        ) : (
          <p className="mt-1 text-xs font-medium text-terracota">
            ⚠ sem próxima ação
          </p>
        ))}
      <SeletorKanban
        valor={negocio.estagio}
        opcoes={ESTAGIOS_NEGOCIO}
        aoMudar={mudarEstagioNegocio.bind(null, negocio.id)}
      />
    </div>
  );
}

export default async function PaginaCrm({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const abaNegocios = aba === "negocios";

  const supabase = await createClient();
  const [{ data: clientes }, { data: negocios }] = await Promise.all([
    supabase.from("fm_clientes").select("*").order("created_at"),
    supabase
      .from("fm_negocios")
      .select("*, cliente:fm_clientes(empresa, nome_contato)")
      .order("created_at"),
  ]);

  const listaClientes = (clientes ?? []) as Cliente[];
  const listaNegocios = (negocios ?? []) as Negocio[];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            CRM
          </h1>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/crm"
              className={
                !abaNegocios
                  ? "border-b-2 border-bronze pb-0.5 font-medium text-ink"
                  : "text-ink-faint hover:text-ink"
              }
            >
              Clientes
            </Link>
            <Link
              href="/crm?aba=negocios"
              className={
                abaNegocios
                  ? "border-b-2 border-bronze pb-0.5 font-medium text-ink"
                  : "text-ink-faint hover:text-ink"
              }
            >
              Funil de negócios
            </Link>
          </nav>
        </div>
        <Link
          href={abaNegocios ? "/crm/negocios/novo" : "/crm/clientes/novo"}
          className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
        >
          {abaNegocios ? "+ Novo negócio" : "+ Novo cliente"}
        </Link>
      </div>

      <div className="overflow-x-auto pb-4">
        {abaNegocios ? (
          <div className="grid min-w-[1000px] grid-cols-5 gap-3">
            {ESTAGIOS_NEGOCIO.map((coluna) => {
              const doEstagio = listaNegocios.filter(
                (n) => n.estagio === coluna.valor,
              );
              const total = doEstagio.reduce((s, n) => s + n.valor, 0);
              return (
                <div
                  key={coluna.valor}
                  className="rounded-card bg-divider/60 p-3"
                >
                  <div className="mb-3 px-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      {coluna.rotulo} · {doEstagio.length}
                    </p>
                    <p className="font-display text-sm font-semibold text-ink-soft">
                      {moedaBRL(total)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {doEstagio.map((n) => (
                      <CartaoNegocio key={n.id} negocio={n} />
                    ))}
                    {doEstagio.length === 0 && (
                      <p className="px-1 text-xs text-ink-faint">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid min-w-[1200px] grid-cols-6 gap-3">
            {STATUS_CLIENTE.map((coluna) => {
              const doStatus = listaClientes.filter(
                (c) => c.status === coluna.valor,
              );
              return (
                <div
                  key={coluna.valor}
                  className="rounded-card bg-divider/60 p-3"
                >
                  <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {coluna.rotulo} · {doStatus.length}
                  </p>
                  <div className="flex flex-col gap-2">
                    {doStatus.map((c) => (
                      <CartaoCliente key={c.id} cliente={c} />
                    ))}
                    {doStatus.length === 0 && (
                      <p className="px-1 text-xs text-ink-faint">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
