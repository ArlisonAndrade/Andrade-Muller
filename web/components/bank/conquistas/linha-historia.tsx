import type { EstadoConquista } from "@/lib/bank/conquistas";
import { SeloHistoriaDesenho } from "@/components/bank/conquistas/selo-historia";

const dataBR = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
const mesAno = (iso: string) => {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
};

// "De onde viemos": os selos da história numa linha do tempo, sempre no topo
// da vitrine e na abertura da reunião. Fundo do Poço → Negociação com BB →
// hoje → Fim do Santander (em construção, com as parcelas pagas).
// Só título e data — decisão do Arlison.
export function LinhaHistoria({
  selos,
  escuro = false,
  tamanho = 88,
}: {
  selos: EstadoConquista[];
  escuro?: boolean;
  tamanho?: number;
}) {
  const ordem = ["historia_fundo_do_poco", "historia_negociacao_bb", "historia_fim_santander"];
  const lista = ordem.map((c) => selos.find((s) => s.codigo === c)).filter((s): s is EstadoConquista => !!s);
  const texto = escuro ? "text-white" : "text-text-primary";
  const apoio = escuro ? "text-white/70" : "text-text-secondary";
  const trilho = escuro ? "bg-white/20" : "bg-border";

  const itens: Array<{ chave: string; no: React.ReactNode }> = [];
  lista.forEach((s, i) => {
    if (i === 2) {
      itens.push({
        chave: "hoje",
        no: (
          <div className="flex flex-col items-center gap-2 text-center">
            <span
              className="flex items-center justify-center rounded-full bg-bank-primaria text-xs font-semibold uppercase tracking-wide text-white"
              style={{ width: tamanho * 0.5, height: tamanho * 0.5 }}
            >
              hoje
            </span>
          </div>
        ),
      });
    }
    const pagas = Number(s.detalhe?.pagas ?? 0);
    const total = Number(s.detalhe?.total ?? 0);
    const prevista = s.detalhe?.quitacaoPrevista as string | null | undefined;
    itens.push({
      chave: s.codigo,
      no: (
        <div className="flex flex-col items-center gap-2 text-center">
          <SeloHistoriaDesenho selo={s.selo!} tamanho={tamanho} bloqueado={!s.conquistada} progresso={s.progresso} />
          <p className={`text-sm font-semibold ${texto}`}>{s.nome}</p>
          <p className={`text-xs ${apoio}`}>
            {s.conquistada && s.data
              ? dataBR(s.data)
              : `${pagas} de ${total} parcelas${prevista ? ` · ${mesAno(prevista)}` : ""}`}
          </p>
        </div>
      ),
    });
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-start justify-between gap-2 sm:min-w-0">
        {itens.map((item, i) => (
          <div key={item.chave} className="flex flex-1 items-start">
            <div className="flex-1">{item.no}</div>
            {i < itens.length - 1 && (
              <div className={`mt-10 h-0.5 w-6 shrink-0 rounded-full sm:w-auto sm:flex-1 ${trilho}`} aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
