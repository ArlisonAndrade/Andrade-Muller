import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { confirmarSugestao, excluirFaturamento } from "@/lib/acoes/faturamento";
import { gerarRecorrenciasPendentes } from "@/lib/bank/acoes/recorrencias";
import { BotaoExcluir } from "@/components/crm/botao-excluir";
import { ENTIDADE_ID, nomeCliente, type Cliente, type Transacao } from "@/lib/tipos";
import { moedaBRL, dataBR, mesBR, mesCurto, rotuloTrimestre } from "@/lib/formato";

interface Nota {
  id: string;
  cliente_id: string | null;
  numero_nfse: string | null;
  valor: number;
  competencia: string;
  status: "pendente" | "concluido" | "atrasado";
  data_emissao: string | null;
  arquivo_origem: string | null;
  enviada_em?: string | null;
  enviada_para?: string | null;
  cliente?: Pick<Cliente, "empresa" | "nome_contato"> | null;
}

const ROTULO_STATUS: Record<string, { texto: string; cor: string }> = {
  concluido: { texto: "Concluído", cor: "text-salvia" },
  pendente: { texto: "Pendente", cor: "text-bronze" },
  atrasado: { texto: "Atrasado", cor: "text-terracota" },
};

// ---------- helpers de calendário ----------
function inicioDoTrimestre(iso: string) {
  const mes = Math.floor((Number(iso.slice(5, 7)) - 1) / 3) * 3 + 1;
  return `${iso.slice(0, 4)}-${String(mes).padStart(2, "0")}-01`;
}

function addMeses(iso: string, n: number) {
  const ano = Number(iso.slice(0, 4));
  const mes0 = Number(iso.slice(5, 7)) - 1 + n;
  const a = ano + Math.floor(mes0 / 12);
  const m = ((mes0 % 12) + 12) % 12;
  return `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ tri?: string }>;
}) {
  const { tri } = await searchParams;
  // Despesas fixas da consultoria (pró-labore, contabilidade, ferramentas)
  // nascem sozinhas no mês, como na planilha — migration 10. Idempotente.
  await gerarRecorrenciasPendentes();
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const triAtual = inicioDoTrimestre(hoje);
  const competenciaAtual = `${hoje.slice(0, 7)}-01`;

  const [{ data: notas }, { data: transacoes }, { data: contratos }, { data: extratos }] =
    await Promise.all([
      supabase
        .from("fm_faturamento")
        .select("*, cliente:fm_clientes(empresa, nome_contato)")
        .order("competencia", { ascending: false })
        .order("created_at"),
      supabase
        .from("transacoes")
        .select("*, categoria:categorias(id, nome, tipo, grupo_dre)")
        .eq("entidade_id", ENTIDADE_ID)
        .order("data", { ascending: false }),
      supabase
        .from("fm_contratos")
        .select("id, cliente_id, valor_mensal, cliente:fm_clientes(empresa, nome_contato)")
        .eq("ativo", true)
        .eq("tipo", "mensal_recorrente"),
      supabase.from("fm_extratos").select("competencia, arquivo_path").eq("entidade_id", ENTIDADE_ID),
    ]);
  const extratoDoMes = new Map((extratos ?? []).map((e) => [String(e.competencia).slice(0, 7), e.arquivo_path as string]));

  const todasNotas = (notas ?? []) as Nota[];
  const todasTrans = (transacoes ?? []) as Transacao[];

  // ---------- faturamento acumulado histórico + marcos ----------
  const totalFaturadoHistorico = todasNotas
    .filter((n) => n.status === "concluido")
    .reduce((s, n) => s + Number(n.valor), 0);
  const MARCOS = [100_000, 500_000, 1_000_000];
  const proximoMarco = MARCOS.find((m) => m > totalFaturadoHistorico) ?? MARCOS[MARCOS.length - 1];
  const marcoAnterior = [0, ...MARCOS].filter((m) => m < proximoMarco).pop() ?? 0;
  const pctProximoMarco = Math.min(
    100,
    ((totalFaturadoHistorico - marcoAnterior) / (proximoMarco - marcoAnterior)) * 100,
  );

  // ---------- somas mensais (base de tudo) ----------
  const fatDoMes = (m: string) =>
    todasNotas
      .filter((n) => n.competencia === m)
      .reduce((s, n) => s + Number(n.valor), 0);
  // DRE por competência, como a planilha: o extrato OFX é CAIXA (o DAS do mês
  // M sai em M+1, o pró-labore pago num mês é do anterior) e serve só de
  // conferência — não entra no DRE nem no Fator R, senão conta em dobro.
  const doDre = todasTrans.filter((t) => !t.ofx_fitid);
  const grupoDoMes = (m: string, grupo: string) =>
    doDre
      .filter(
        (t) =>
          t.data.slice(0, 7) === m.slice(0, 7) &&
          t.categoria?.grupo_dre === grupo,
      )
      .reduce((s, t) => s + Number(t.valor), 0);
  const categoriaDoMes = (m: string, trecho: string) =>
    doDre
      .filter(
        (t) =>
          t.data.slice(0, 7) === m.slice(0, 7) &&
          t.categoria?.nome.includes(trecho),
      )
      .reduce((s, t) => s + Number(t.valor), 0);

  // ---------- abas de trimestre ----------
  const trimestres = [
    ...new Set([
      triAtual,
      ...todasNotas.map((n) => inicioDoTrimestre(n.competencia)),
      ...todasTrans.map((t) => inicioDoTrimestre(t.data)),
    ]),
  ].sort((a, b) => (a < b ? 1 : -1));
  const triSel = tri && trimestres.includes(tri) ? tri : triAtual;
  const mesesTri = [triSel, addMeses(triSel, 1), addMeses(triSel, 2)];
  const fimTri = addMeses(triSel, 3);

  // ---------- Fator R e DAS do mês ----------
  // Folha ÷ faturamento dos 12 meses ANTERIORES; ≥ 28% = Anexo III (~6%).
  const fatorDoMes = (m: string) => {
    const doze = Array.from({ length: 12 }, (_, i) => addMeses(m, -(i + 1)));
    const rbt12 = doze.reduce((s, x) => s + fatDoMes(x), 0);
    const fs12 = doze.reduce((s, x) => s + grupoDoMes(x, "folha"), 0);
    const fator = rbt12 > 0 ? fs12 / rbt12 : null;
    const anexoIII = fator !== null && fator >= 0.28;
    const aliquota = fator === null ? null : anexoIII ? 0.06 : 0.155;
    return { rbt12, fs12, fator, anexoIII, aliquota };
  };
  // Imposto do mês como a planilha faz: DAS = alíquota do Fator R × notas.
  // Mês com imposto LANÇADO usa o lançado (é o real e preserva o histórico);
  // só mês sem lançamento usa o calculado, marcado como tal na tela.
  const impostoLancado = (m: string) => grupoDoMes(m, "imposto");
  const dasCalculado = (m: string) => {
    const { aliquota } = fatorDoMes(m);
    return aliquota === null ? null : aliquota * fatDoMes(m);
  };
  const impostoEhCalculado = (m: string) =>
    impostoLancado(m) === 0 && fatDoMes(m) > 0 && dasCalculado(m) !== null;
  const impostoDoMes = (m: string) =>
    impostoEhCalculado(m) ? (dasCalculado(m) as number) : impostoLancado(m);

  // ---------- DRE (linhas exatas da planilha) ----------
  type Linha = {
    rotulo: string;
    tipo: "valor" | "deducao" | "total" | "pct";
    porMes: (m: string) => number;
    calculado?: (m: string) => boolean; // valor estimado, não lançado
  };
  const dreDoMes = (m: string) => {
    const fat = fatDoMes(m);
    const impostos = impostoDoMes(m);
    const cps = grupoDoMes(m, "cps");
    const fixas = grupoDoMes(m, "folha") + grupoDoMes(m, "fixa");
    const variaveis = grupoDoMes(m, "variavel");
    const lucro = fat - impostos - cps - fixas - variaveis;
    return { fat, impostos, cps, fixas, variaveis, lucro };
  };
  const linhasDre: Linha[] = [
    { rotulo: "Faturamento Bruto", tipo: "valor", porMes: (m) => dreDoMes(m).fat },
    { rotulo: "(−) Impostos sobre o faturamento", tipo: "deducao", porMes: (m) => dreDoMes(m).impostos, calculado: impostoEhCalculado },
    { rotulo: "(=) Faturamento Líquido", tipo: "total", porMes: (m) => dreDoMes(m).fat - dreDoMes(m).impostos },
    { rotulo: "(−) Custo do serviço prestado", tipo: "deducao", porMes: (m) => dreDoMes(m).cps },
    { rotulo: "(−) Despesas fixas (inclui pró-labore)", tipo: "deducao", porMes: (m) => dreDoMes(m).fixas },
    { rotulo: "(−) Despesas variáveis", tipo: "deducao", porMes: (m) => dreDoMes(m).variaveis },
    { rotulo: "(=) Lucro Líquido", tipo: "total", porMes: (m) => dreDoMes(m).lucro },
  ];

  // ---------- Alocação de destinação de lucro ----------
  // Pró-labore líquido = bruto menos 11% de INSS retido — é o que de fato é retirado.
  const INSS_PROLABORE = 0.11;
  const prolaboreLiquidoDoMes = (m: string) => grupoDoMes(m, "folha") * (1 - INSS_PROLABORE);
  const linhasAlocacao: Linha[] = [
    { rotulo: "Reserva de Emergência (RE)", tipo: "valor", porMes: (m) => categoriaDoMes(m, "Reserva") },
    { rotulo: "Retirada de Pró-Labore", tipo: "valor", porMes: prolaboreLiquidoDoMes },
    { rotulo: "Pagamento de Dividendos", tipo: "valor", porMes: (m) => categoriaDoMes(m, "Dividendos") },
  ];
  const lucroAcionista = (m: string) => {
    const fat = fatDoMes(m);
    if (fat === 0) return null;
    return (prolaboreLiquidoDoMes(m) + categoriaDoMes(m, "Dividendos")) / fat;
  };

  // ---------- Fator R (Simples Nacional) ----------
  const mesesComDado = [
    ...new Set([
      ...todasNotas.map((n) => n.competencia),
      ...todasTrans.map((t) => `${t.data.slice(0, 7)}-01`),
    ]),
  ]
    .filter((m) => m <= competenciaAtual)
    .sort();
  const fatorR = mesesComDado.map((m) => {
    const f = fatorDoMes(m);
    return {
      mes: m,
      fat: fatDoMes(m),
      folha: grupoDoMes(m, "folha"),
      ...f,
      das: f.aliquota === null ? null : f.aliquota * fatDoMes(m),
    };
  });

  // ---------- situação de cada mês do trimestre ----------
  // Diz o que falta antes de o número ser lido como certo: sem isto, mês sem
  // pró-labore lançado aparecia com lucro inflado, sem aviso nenhum.
  type Item = { rotulo: string; texto: string; estado: "ok" | "estimado" | "falta" | "neutro"; link?: string };
  const situacaoDoMes = (m: string) => {
    const notas = todasNotas.filter((n) => n.competencia === m);
    const extrato = todasTrans.some((t) => t.data.slice(0, 7) === m.slice(0, 7) && t.ofx_fitid);
    const itens: Item[] = [
      notas.length > 0
        ? { rotulo: "Notas", texto: `${notas.length} · ${moedaBRL(fatDoMes(m))}`, estado: "ok" }
        : { rotulo: "Notas", texto: "nenhuma lançada", estado: "falta" },
      impostoLancado(m) > 0
        ? { rotulo: "Imposto", texto: `lançado ${moedaBRL(impostoLancado(m))}`, estado: "ok" }
        : impostoEhCalculado(m)
          ? { rotulo: "Imposto", texto: `DAS calculado ${moedaBRL(dasCalculado(m) as number)}`, estado: "estimado" }
          : { rotulo: "Imposto", texto: "—", estado: "neutro" },
      grupoDoMes(m, "folha") > 0
        ? { rotulo: "Pró-labore", texto: moedaBRL(grupoDoMes(m, "folha")), estado: "ok" }
        : { rotulo: "Pró-labore", texto: "falta lançar", estado: "falta" },
      grupoDoMes(m, "fixa") > 0
        ? { rotulo: "Despesas fixas", texto: moedaBRL(grupoDoMes(m, "fixa")), estado: "ok" }
        : { rotulo: "Despesas fixas", texto: "falta lançar", estado: "falta" },
      extrato
        ? {
            rotulo: "Extrato",
            texto: "importado (conferência)",
            estado: "ok",
            link: extratoDoMes.has(m.slice(0, 7))
              ? `/financeiro/arquivo?caminho=${encodeURIComponent(extratoDoMes.get(m.slice(0, 7))!)}`
              : undefined,
          }
        : { rotulo: "Extrato", texto: "não importado", estado: "neutro" },
    ];
    const resumo = itens.some((i) => i.estado === "falta")
      ? { texto: "Incompleto", cor: "text-terracota" }
      : itens.some((i) => i.estado === "estimado")
        ? { texto: "Com estimativa", cor: "text-bronze" }
        : { texto: "Completo", cor: "text-salvia" };
    return { itens, resumo };
  };
  const mesesComSituacao = mesesTri.filter((m) => m <= competenciaAtual);

  // ---------- dados dos cards de detalhe ----------
  const transTri = todasTrans.filter((t) => t.data >= triSel && t.data < fimTri);
  const notasTri = todasNotas.filter(
    (n) => n.competencia >= triSel && n.competencia < fimTri,
  );
  const notasPorMes = new Map<string, Nota[]>();
  for (const n of notasTri) {
    const grupo = notasPorMes.get(n.competencia) ?? [];
    grupo.push(n);
    notasPorMes.set(n.competencia, grupo);
  }

  const clientesLancadosNoMes = new Set(
    todasNotas
      .filter((n) => n.competencia === competenciaAtual)
      .map((n) => n.cliente_id),
  );
  const sugestoes =
    triSel === triAtual
      ? (contratos ?? []).filter((c) => !clientesLancadosNoMes.has(c.cliente_id))
      : [];

  const celula = (valor: number, tipo: Linha["tipo"]) => (
    <td
      className={`whitespace-nowrap px-2 py-1.5 text-right font-display text-sm ${
        tipo === "total"
          ? `font-semibold ${valor >= 0 ? "text-salvia" : "text-terracota"}`
          : tipo === "deducao"
            ? "text-terracota/80"
            : "font-medium text-ink"
      }`}
    >
      {moedaBRL(valor)}
    </td>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">
            Financeiro
          </h1>
          <p className="text-sm text-ink-faint">
            DRE, destinação de lucro e Fator R — a planilha, viva
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/financeiro/importar"
            className="rounded-lg border border-divider bg-card px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Importar extrato
          </Link>
          <Link
            href="/financeiro/lancamento/novo"
            className="rounded-lg border border-divider bg-card px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            + Despesa/lançamento
          </Link>
          <Link
            href="/financeiro/lancar"
            className="rounded-lg border border-divider bg-card px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Lançar NFS-e à mão
          </Link>
          <Link
            href="/financeiro/notas"
            className="rounded-lg bg-marinho px-4 py-2 text-sm font-medium text-card hover:opacity-90"
          >
            Subir NFS-e
          </Link>
        </div>
      </div>

      <nav className="mb-6 flex gap-1.5 overflow-x-auto">
        {trimestres.map((t) => (
          <Link
            key={t}
            href={`/financeiro?tri=${t}`}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${
              t === triSel
                ? "bg-marinho text-card"
                : "bg-card text-ink-soft shadow-card hover:text-ink"
            }`}
          >
            {rotuloTrimestre(t)}
          </Link>
        ))}
      </nav>

      <Card className="mb-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">
              Faturamento acumulado — histórico
            </p>
            <p className="font-display text-3xl font-semibold text-ink">
              {moedaBRL(totalFaturadoHistorico)}
            </p>
          </div>
          <p className="text-sm text-ink-faint">
            Faltam {moedaBRL(proximoMarco - totalFaturadoHistorico)} para{" "}
            {moedaBRL(proximoMarco)}
          </p>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-divider">
          <div
            className="h-full rounded-full bg-bronze transition-all"
            style={{ width: `${pctProximoMarco}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between">
          {MARCOS.map((marco) => {
            const atingido = totalFaturadoHistorico >= marco;
            return (
              <div key={marco} className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    atingido
                      ? "bg-salvia text-card"
                      : "bg-card text-ink-faint shadow-card"
                  }`}
                >
                  {atingido ? "✓" : ""}
                </span>
                <span
                  className={`font-display text-xs font-medium ${
                    atingido ? "text-salvia" : "text-ink-faint"
                  }`}
                >
                  {marco >= 1_000_000 ? "1M" : `${marco / 1000}k`}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {sugestoes.length > 0 && (
        <Card title={`Sugestões de ${mesBR(competenciaAtual)}`} className="mb-6">
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

      {mesesComSituacao.length > 0 && (
        <Card title="Situação do mês" className="mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {mesesComSituacao.map((m) => {
              const { itens, resumo } = situacaoDoMes(m);
              return (
                <div key={m} className="rounded-lg bg-parchment/60 px-4 py-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="font-display text-sm font-medium capitalize text-ink">{mesBR(m)}</h3>
                    <span className={`text-xs font-semibold ${resumo.cor}`}>{resumo.texto}</span>
                  </div>
                  <ul className="flex flex-col gap-1 text-xs">
                    {itens.map((i) => (
                      <li key={i.rotulo} className="flex items-baseline justify-between gap-2">
                        <span className="flex items-baseline gap-1.5 text-ink-soft">
                          <span
                            aria-hidden
                            className={
                              i.estado === "ok"
                                ? "text-salvia"
                                : i.estado === "estimado"
                                  ? "text-bronze"
                                  : i.estado === "falta"
                                    ? "text-terracota"
                                    : "text-ink-faint"
                            }
                          >
                            {i.estado === "ok" ? "✓" : i.estado === "estimado" ? "≈" : i.estado === "falta" ? "✕" : "·"}
                          </span>
                          {i.rotulo}
                        </span>
                        <span
                          className={`text-right font-display ${
                            i.estado === "falta" ? "text-terracota" : i.estado === "estimado" ? "text-bronze" : "text-ink"
                          }`}
                        >
                          {i.link ? (
                            <a href={i.link} target="_blank" rel="noreferrer" className="underline decoration-divider underline-offset-2 hover:text-marinho">
                              {i.texto}
                            </a>
                          ) : (
                            i.texto
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Por competência, como a planilha: ≈ DAS calculado pela alíquota do Fator R × notas do mês (o pagamento sai no
            mês seguinte). Pró-labore, contabilidade e ferramentas são gerados todo dia 15. O extrato importado é
            conferência de caixa e não entra no DRE.
          </p>
        </Card>
      )}

      <Card title={`DRE — ${rotuloTrimestre(triSel)}`} className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-divider text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-2 text-left font-medium">Métrica de resultados</th>
                {mesesTri.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-medium">
                    {mesCurto(m)}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium">Trimestre</th>
              </tr>
            </thead>
            <tbody>
              {linhasDre.map((l) => (
                <tr
                  key={l.rotulo}
                  className={l.tipo === "total" ? "border-t border-divider" : ""}
                >
                  <td
                    className={`py-1.5 pr-2 ${
                      l.tipo === "total"
                        ? "font-medium text-ink"
                        : "text-ink-soft"
                    }`}
                  >
                    {l.rotulo}
                  </td>
                  {mesesTri.map((m) =>
                    l.calculado?.(m) ? (
                      <td
                        key={m}
                        title="DAS calculado: alíquota do Fator R × notas do mês. Some quando o DAS pago for lançado."
                        className="whitespace-nowrap px-2 py-1.5 text-right font-display text-sm italic text-terracota/60"
                      >
                        {moedaBRL(l.porMes(m))}
                        <sup className="ml-0.5 not-italic text-[10px] text-ink-faint">calc.</sup>
                      </td>
                    ) : (
                      <FragmentoCelula key={m} valor={l.porMes(m)} tipo={l.tipo} celula={celula} />
                    ),
                  )}
                  <FragmentoCelula
                    valor={mesesTri.reduce((s, m) => s + l.porMes(m), 0)}
                    tipo={l.tipo}
                    celula={celula}
                  />
                </tr>
              ))}
              <tr>
                <td className="py-1.5 pr-2 text-ink-soft">Margem de lucro</td>
                {[...mesesTri, "tri"].map((m) => {
                  const fat =
                    m === "tri"
                      ? mesesTri.reduce((s, x) => s + fatDoMes(x), 0)
                      : fatDoMes(m);
                  const lucro =
                    m === "tri"
                      ? mesesTri.reduce((s, x) => s + dreDoMes(x).lucro, 0)
                      : dreDoMes(m).lucro;
                  return (
                    <td key={m} className="px-2 py-1.5 text-right font-display text-sm font-semibold text-bronze">
                      {fat > 0 ? `${((lucro / fat) * 100).toFixed(1).replace(".", ",")}%` : "—"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Alocação de destinação de lucro" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-divider text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-2 text-left font-medium">Destinação</th>
                {mesesTri.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-medium">
                    {mesCurto(m)}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium">Trimestre</th>
              </tr>
            </thead>
            <tbody>
              {linhasAlocacao.map((l) => (
                <tr key={l.rotulo}>
                  <td className="py-1.5 pr-2 text-ink-soft">{l.rotulo}</td>
                  {mesesTri.map((m) => (
                    <td key={m} className="whitespace-nowrap px-2 py-1.5 text-right font-display text-sm text-ink">
                      {moedaBRL(l.porMes(m))}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-display text-sm font-semibold text-ink">
                    {moedaBRL(mesesTri.reduce((s, m) => s + l.porMes(m), 0))}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-divider">
                <td className="py-1.5 pr-2 font-medium text-ink">
                  Lucro do acionista (% do faturamento)
                </td>
                {[...mesesTri, "tri"].map((m) => {
                  let pct: number | null;
                  if (m === "tri") {
                    const fat = mesesTri.reduce((s, x) => s + fatDoMes(x), 0);
                    const bolso = mesesTri.reduce(
                      (s, x) =>
                        s + prolaboreLiquidoDoMes(x) + categoriaDoMes(x, "Dividendos"),
                      0,
                    );
                    pct = fat > 0 ? bolso / fat : null;
                  } else {
                    pct = lucroAcionista(m);
                  }
                  return (
                    <td key={m} className="px-2 py-1.5 text-right font-display text-sm font-semibold text-bronze">
                      {pct === null ? "—" : `${(pct * 100).toFixed(1).replace(".", ",")}%`}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Controle do Fator R (Simples Nacional)" className="mb-6">
        <p className="mb-3 text-xs text-ink-faint">
          Calculado automaticamente dos lançamentos: folha (pró-labore bruto) ÷
          faturamento dos 12 meses anteriores. Abaixo de 28% cai no Anexo V
          (alíquota ~15,5% em vez de ~6%).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-divider text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-2 text-left font-medium">Mês</th>
                <th className="px-2 py-2 text-right font-medium">Faturamento</th>
                <th className="px-2 py-2 text-right font-medium">Folha</th>
                <th className="px-2 py-2 text-right font-medium">RBT12</th>
                <th className="px-2 py-2 text-right font-medium">FS12</th>
                <th className="px-2 py-2 text-right font-medium">Fator R</th>
                <th className="px-2 py-2 text-left font-medium">Anexo</th>
                <th className="px-2 py-2 text-right font-medium">DAS estimado</th>
              </tr>
            </thead>
            <tbody>
              {fatorR.map((f) => (
                <tr key={f.mes} className="border-b border-divider/40 last:border-0">
                  <td className="py-1.5 pr-2 capitalize text-ink">{mesCurto(f.mes)}</td>
                  <td className="px-2 py-1.5 text-right font-display text-ink">
                    {moedaBRL(f.fat)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-display text-ink-soft">
                    {moedaBRL(f.folha)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-ink-soft">
                    {f.rbt12 > 0 ? moedaBRL(f.rbt12) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right text-ink-soft">
                    {f.rbt12 > 0 ? moedaBRL(f.fs12) : "—"}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-display font-semibold ${
                      f.fator === null
                        ? "text-ink-faint"
                        : f.anexoIII
                          ? "text-salvia"
                          : "text-terracota"
                    }`}
                  >
                    {f.fator === null ? "—" : `${(f.fator * 100).toFixed(2).replace(".", ",")}%`}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-xs font-medium ${
                      f.fator === null
                        ? "text-ink-faint"
                        : f.anexoIII
                          ? "text-salvia"
                          : "text-terracota"
                    }`}
                  >
                    {f.fator === null
                      ? "—"
                      : f.anexoIII
                        ? "Anexo III (~6%)"
                        : "⚠ Anexo V (~15,5%)"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-display font-semibold text-ink">
                    {f.das === null ? "—" : moedaBRL(f.das)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card title={`Lançamentos — ${rotuloTrimestre(triSel)}`}>
          {transTri.length === 0 ? (
            <p className="text-sm text-ink-faint">
              Nenhum lançamento neste trimestre.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {transTri.map((t) => (
                  <tr key={t.id} className="border-b border-divider/50 align-top last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-ink-faint">
                      {dataBR(t.data)}
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/financeiro/lancamento/${t.id}`}
                        className="text-ink hover:text-marinho"
                      >
                        {t.descricao.length > 42
                          ? `${t.descricao.slice(0, 42)}…`
                          : t.descricao}
                      </Link>
                      <p className="text-xs text-ink-faint">
                        {t.ofx_fitid ? "Extrato · conferência, fora do DRE" : t.categoria?.nome}
                      </p>
                    </td>
                    <td
                      className={`whitespace-nowrap py-2 text-right font-display font-semibold ${
                        t.categoria?.tipo === "receita"
                          ? "text-salvia"
                          : "text-terracota"
                      }`}
                    >
                      {t.categoria?.tipo === "receita" ? "+" : "−"}{" "}
                      {moedaBRL(Number(t.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title={`NFS-e — ${rotuloTrimestre(triSel)}`}>
          {notasPorMes.size === 0 && (
            <p className="text-sm text-ink-faint">
              Nenhuma nota lançada neste trimestre.
            </p>
          )}
          {[...notasPorMes.entries()].map(([competencia, doMes]) => {
            const subtotal = doMes.reduce((s, n) => s + Number(n.valor), 0);
            return (
              <div key={competencia} className="mb-5 last:mb-0">
                <div className="mb-1.5 flex items-baseline justify-between border-b border-divider pb-1">
                  <h3 className="font-display text-sm font-medium capitalize text-ink">
                    {mesBR(competencia)}
                  </h3>
                  <span className="font-display text-xs font-semibold text-ink-soft">
                    {moedaBRL(subtotal)}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {doMes.map((n) => {
                      const st = ROTULO_STATUS[n.status] ?? { texto: n.status, cor: "" };
                      return (
                        <tr key={n.id} className="border-b border-divider/40 last:border-0">
                          <td className="py-1.5 pr-2 text-ink">
                            {n.cliente ? nomeCliente(n.cliente) : "—"}
                          </td>
                          <td className="py-1.5 pr-2 text-xs text-ink-faint">
                            {n.arquivo_origem?.startsWith("notas/") ? (
                              <a
                                href={`/financeiro/arquivo?caminho=${encodeURIComponent(n.arquivo_origem)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="underline decoration-divider underline-offset-2 hover:text-marinho"
                                title="Abrir o PDF original"
                              >
                                {n.numero_nfse ?? "PDF"}
                              </a>
                            ) : (
                              (n.numero_nfse ?? "—")
                            )}
                            {n.enviada_em && (
                              <span
                                className="ml-1.5 text-salvia"
                                title={`Enviada pra ${n.enviada_para ?? "—"}`}
                              >
                                ✉ {dataBR(n.enviada_em.slice(0, 10))?.slice(0, 5)}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap py-1.5 pr-2 text-right font-display font-semibold text-ink">
                            {moedaBRL(Number(n.valor))}
                          </td>
                          <td className={`py-1.5 pr-2 text-xs font-medium ${st.cor}`}>
                            {st.texto}
                          </td>
                          <td className="py-1.5 text-right text-xs">
                            <BotaoExcluir
                              aoConfirmar={excluirFaturamento.bind(null, n.id)}
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
    </div>
  );
}

function FragmentoCelula({
  valor,
  tipo,
  celula,
}: {
  valor: number;
  tipo: "valor" | "deducao" | "total" | "pct";
  celula: (v: number, t: "valor" | "deducao" | "total" | "pct") => React.ReactNode;
}) {
  return <>{celula(valor, tipo)}</>;
}
