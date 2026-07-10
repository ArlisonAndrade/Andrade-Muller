import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Meta } from "@/components/metas/form-meta";

const COR_STATUS: Record<string, string> = {
  em_andamento: "bg-bronze/15 text-bronze",
  concluido: "bg-salvia/15 text-salvia",
  atrasado: "bg-terracota/15 text-terracota",
};

const ROTULO_STATUS: Record<string, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  atrasado: "Atrasado",
};

export default async function PaginaMetas() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fm_metas_okrs")
    .select("*")
    .order("trimestre", { ascending: false })
    .order("created_at");

  const metas = (data ?? []) as Meta[];

  // Agrupar por trimestre (o mais recente primeiro)
  const porTrimestre = new Map<string, Meta[]>();
  for (const m of metas) {
    const chave = m.trimestre ?? "Sem trimestre";
    const grupo = porTrimestre.get(chave) ?? [];
    grupo.push(m);
    porTrimestre.set(chave, grupo);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Metas & OKRs
          </h1>
          <p className="text-sm text-ink-faint">
            Objetivos e key results por trimestre
          </p>
        </div>
        <Link
          href="/metas/nova"
          className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
        >
          + Nova meta
        </Link>
      </div>

      {porTrimestre.size === 0 && (
        <Card>
          <p className="text-sm text-ink-faint">
            Nenhuma meta cadastrada ainda — crie a primeira. O progresso aparece
            aqui e no dashboard.
          </p>
        </Card>
      )}

      {[...porTrimestre.entries()].map(([trimestre, doTrimestre]) => (
        <Card key={trimestre} title={trimestre} className="mb-6">
          <div className="flex flex-col gap-5">
            {doTrimestre.map((m) => {
              const progresso = m.valor_alvo
                ? Math.min(100, Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100))
                : 0;
              return (
                <div key={m.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <div>
                      <Link
                        href={`/metas/${m.id}`}
                        className="text-sm font-medium text-ink hover:text-marinho"
                      >
                        {m.objetivo}
                      </Link>
                      <p className="text-xs text-ink-faint">{m.key_result}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_STATUS[m.status] ?? ""}`}
                      >
                        {ROTULO_STATUS[m.status] ?? m.status}
                      </span>
                      <span className="font-display text-sm font-semibold text-bronze">
                        {progresso}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-divider">
                    <div
                      className={`h-full rounded-full ${m.status === "atrasado" ? "bg-terracota" : "bg-bronze"}`}
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-ink-faint">
                    {Number(m.valor_atual).toLocaleString("pt-BR")} de{" "}
                    {Number(m.valor_alvo ?? 0).toLocaleString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
