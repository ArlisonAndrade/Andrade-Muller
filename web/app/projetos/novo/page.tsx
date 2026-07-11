import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { criarProjeto } from "@/lib/acoes/projetos";
import {
  FASES_PROJETO,
  nomeCliente,
  type TemplateTarefa,
} from "@/lib/tipos";

const estiloInput =
  "w-full rounded-lg border border-divider bg-card px-3 py-2 text-sm text-ink outline-none focus:border-bronze";

export default async function NovoProjeto() {
  const supabase = await createClient();
  const [{ data: clientes }, { data: templates }] = await Promise.all([
    supabase.from("fm_clientes").select("id, empresa, nome_contato").order("empresa"),
    supabase
      .from("fm_templates_tarefas")
      .select("*")
      .eq("ativo", true)
      .order("prazo_dias"),
  ]);

  const porFase = new Map<string, TemplateTarefa[]>();
  for (const t of (templates ?? []) as TemplateTarefa[]) {
    const grupo = porFase.get(t.fase) ?? [];
    grupo.push(t);
    porFase.set(t.fase, grupo);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
        Novo projeto
      </h1>
      <p className="mb-6 text-sm text-ink-faint">
        Os templates marcados viram tarefas com prazo calculado a partir da
        data de início — o esqueleto pronto, sem duplicação manual.
      </p>
      <form action={criarProjeto}>
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-ink-faint">
                Nome do projeto *
              </span>
              <input
                name="nome"
                required
                placeholder="Levantamento Estrutural do Curso de Primeiros Socorros Equinos"
                className={estiloInput}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-faint">
                Cliente *
              </span>
              <select name="cliente_id" required defaultValue="" className={estiloInput}>
                <option value="" disabled>
                  Selecione…
                </option>
                {(clientes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {nomeCliente(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-faint">
                Início *
              </span>
              <input
                name="data_inicio"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={estiloInput}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-faint">
                Previsão de término
              </span>
              <input name="data_fim_prevista" type="date" className={estiloInput} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-faint">
                Descrição
              </span>
              <input name="descricao" className={estiloInput} />
            </label>
          </div>
        </Card>

        <Card title="Cronograma pela Biblioteca de Templates" className="mt-6">
          {FASES_PROJETO.map((fase) => {
            const doFase = porFase.get(fase.valor) ?? [];
            if (doFase.length === 0) return null;
            return (
              <div key={fase.valor} className="mb-4 last:mb-0">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
                  {fase.rotulo}
                </p>
                <div className="flex flex-col gap-1">
                  {doFase.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-parchment/60"
                    >
                      <input
                        type="checkbox"
                        name="templates"
                        value={t.id}
                        defaultChecked
                        className="mt-0.5 h-4 w-4 shrink-0 accent-salvia"
                      />
                      <span className="text-sm text-ink">
                        {t.nome}{" "}
                        <span className="text-xs text-ink-faint">
                          · dia +{t.prazo_dias} · {t.prioridade}
                        </span>
                        {t.descricao && (
                          <span className="block text-xs text-ink-faint">{t.descricao}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="mt-4 border-t border-divider pt-4">
            <button
              type="submit"
              className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90"
            >
              Criar projeto + cronograma
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}
