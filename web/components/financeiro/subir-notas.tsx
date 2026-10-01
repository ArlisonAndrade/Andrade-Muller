"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { prepararNotas, salvarNotas, type NotaPreparada, type ResultadoNotas } from "@/lib/acoes/notas";
import { moedaBRL, dataBR, mesBR } from "@/lib/formato";

const nomeDoMes = (iso: string) => {
  const m = mesBR(iso).split(" ")[0];
  return m[0].toUpperCase() + m.slice(1);
};

// Subir NFS-e: o PDF original vai do navegador direto pro bucket privado
// `fiscal` (notas/entrada/…); o servidor lê, confere, arquiva no mês e mostra
// a prévia. Só depois do clique a nota é lançada e o e-mail sai — com o
// arquivo original, conferido pelo SHA-256.

export function SubirNotas({ envioConfigurado }: { envioConfigurado: boolean }) {
  const [notas, setNotas] = useState<NotaPreparada[]>([]);
  const [lendo, setLendo] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoNotas | null>(null);
  const [reenviarOk, setReenviarOk] = useState(false);
  const [gravando, startTransition] = useTransition();
  const router = useRouter();

  async function aoEscolher(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setErroUpload(null);
    setResultado(null);
    setNotas([]);
    setReenviarOk(false);
    setLendo(true);
    try {
      const supabase = createClient();
      const entradas: Array<{ caminho: string; nome: string }> = [];
      for (const arquivo of Array.from(arquivos)) {
        if (!arquivo.name.toLowerCase().endsWith(".pdf")) {
          setErroUpload(`"${arquivo.name}" não é PDF.`);
          continue;
        }
        const caminho = `notas/entrada/${Date.now()}-${Math.random().toString(36).slice(2, 8)}/${arquivo.name}`;
        const { error } = await supabase.storage
          .from("fiscal")
          .upload(caminho, arquivo, { contentType: "application/pdf", upsert: false });
        if (error) throw new Error(`Não consegui subir "${arquivo.name}": ${error.message}`);
        entradas.push({ caminho, nome: arquivo.name });
      }
      if (entradas.length > 0) setNotas(await prepararNotas(entradas));
    } catch (err) {
      setErroUpload(err instanceof Error ? err.message : String(err));
    } finally {
      setLendo(false);
    }
  }

  const validas = notas.filter((n) => !n.erro && n.nota && n.cliente);
  const comErro = notas.filter((n) => n.erro);
  const jaEnviadas = validas.filter((n) => n.existente?.enviadaEm);
  const podeAgir = validas.length > 0 && comErro.length === 0 && !gravando;
  const podeEnviar = podeAgir && envioConfigurado && (jaEnviadas.length === 0 || reenviarOk);

  // Prévia do envio: um e-mail por destinatário.
  const destinos = new Map<string, NotaPreparada[]>();
  for (const n of validas) {
    const para = n.cliente!.emailNf ?? "(sem e-mail cadastrado)";
    destinos.set(para, [...(destinos.get(para) ?? []), n]);
  }

  function agir(modo: "salvar" | "teste" | "enviar") {
    startTransition(async () => {
      const r = await salvarNotas(
        validas.map((n) => ({ caminho: n.caminho, sha256: n.sha256 })),
        modo,
      );
      setResultado(r);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-divider bg-parchment/50 px-6 py-10 text-center hover:border-bronze"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          aoEscolher(e.dataTransfer.files);
        }}
      >
        <span className="font-display text-lg font-medium text-ink">
          {lendo ? "Lendo as notas…" : "Arraste os PDFs das NFS-e aqui ou toque pra escolher"}
        </span>
        <span className="text-xs text-ink-faint">
          O PDF original é guardado como veio — é ele que vai no e-mail, sem nenhuma alteração.
        </span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          disabled={lendo || gravando}
          onChange={(e) => aoEscolher(e.target.files)}
        />
      </label>

      {erroUpload && <p className="rounded-lg bg-terracota/10 px-4 py-2.5 text-sm text-terracota">{erroUpload}</p>}

      {notas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3">Nº</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3 text-right">Valor</th>
                <th className="py-2 pr-3">Competência</th>
                <th className="py-2 pr-3">Emissão</th>
                <th className="py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => (
                <tr key={n.caminho} className="border-b border-divider/60 align-top last:border-0">
                  {n.nota ? (
                    <>
                      <td className="py-2.5 pr-3 font-display font-semibold text-ink">{n.nota.numero}</td>
                      <td className="py-2.5 pr-3 text-ink">{n.cliente?.nome ?? n.nota.tomadorNome}</td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-display font-semibold text-ink">
                        {moedaBRL(n.nota.valor)}
                      </td>
                      <td className="py-2.5 pr-3 capitalize text-ink-soft">{mesBR(n.nota.competencia)}</td>
                      <td className="py-2.5 pr-3 text-ink-soft">{dataBR(n.nota.emissao)}</td>
                    </>
                  ) : (
                    <td colSpan={5} className="py-2.5 pr-3 text-ink-soft">
                      {n.arquivo}
                    </td>
                  )}
                  <td className="py-2.5 text-xs">
                    {n.erro ? (
                      <span className="text-terracota">✕ {n.erro}</span>
                    ) : n.existente?.enviadaEm ? (
                      <span className="text-bronze">⚠ já enviada em {dataBR(n.existente.enviadaEm.slice(0, 10))}</span>
                    ) : n.existente ? (
                      <span className="text-salvia">✓ atualiza a nota já lançada</span>
                    ) : (
                      <span className="text-salvia">✓ nota nova</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {validas.length > 0 && comErro.length === 0 && (
        <div className="rounded-xl bg-parchment/60 px-4 py-3 text-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">O e-mail</p>
          {[...destinos.entries()].map(([para, lista]) => (
            <p key={para} className="text-ink">
              Pra <strong>{para}</strong>
              {lista[0].cliente?.contatoNf ? ` (${lista[0].cliente.contatoNf})` : ""} — “NF - Referente a{" "}
              {nomeDoMes(lista[0].nota!.competencia)}”, com {lista.map((l) => `nº ${l.nota!.numero}`).join(" e ")} em anexo.
            </p>
          ))}
          {jaEnviadas.length > 0 && (
            <label className="mt-2 flex items-center gap-2 text-bronze">
              <input type="checkbox" checked={reenviarOk} onChange={(e) => setReenviarOk(e.target.checked)} className="accent-bronze" />
              Já foi enviada antes. Marque pra enviar de novo.
            </label>
          )}
          {!envioConfigurado && (
            <p className="mt-2 text-terracota">
              O envio ainda não está configurado no servidor (GMAIL_USUARIO e GMAIL_SENHA_APP). Dá pra salvar, não pra enviar.
            </p>
          )}
        </div>
      )}

      {notas.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => agir("teste")}
            disabled={!podeAgir || !envioConfigurado}
            className="rounded-lg border border-divider bg-card px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-40"
          >
            Enviar teste pra mim
          </button>
          <button
            type="button"
            onClick={() => agir("salvar")}
            disabled={!podeAgir}
            className="rounded-lg border border-divider bg-card px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-40"
          >
            Só salvar
          </button>
          <button
            type="button"
            onClick={() => agir("enviar")}
            disabled={!podeEnviar}
            className="rounded-lg bg-marinho px-5 py-2 text-sm font-medium text-card hover:opacity-90 disabled:opacity-40"
          >
            {gravando ? "Salvando…" : "Salvar e enviar"}
          </button>
        </div>
      )}

      {resultado && (
        <ul
          className={`rounded-lg px-4 py-3 text-sm ${resultado.ok ? "bg-salvia/10 text-salvia" : "bg-terracota/10 text-terracota"}`}
        >
          {resultado.mensagens.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
