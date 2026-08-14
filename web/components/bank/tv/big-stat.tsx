// Bloco de número gigante pro Modo TV — pensado pra ler de longe (sofá,
// TV na parede). Sem interatividade, então funciona tanto no server
// (montado dentro de app/bank/tv/page.tsx) quanto dentro do client.
export function BigStat({
  rotulo,
  valor,
  apoio,
  cor,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  cor?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium uppercase tracking-wide text-white/70 sm:text-base">{rotulo}</p>
      <p
        className="mt-1 break-words text-2xl font-bold numeros-tabulares sm:text-3xl lg:text-4xl"
        style={{ color: cor ?? "#ffffff" }}
      >
        {valor}
      </p>
      {apoio && <p className="mt-1 text-sm text-white/70 sm:text-base">{apoio}</p>}
    </div>
  );
}
