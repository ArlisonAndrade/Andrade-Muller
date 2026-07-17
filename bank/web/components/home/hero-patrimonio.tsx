import { moedaBRL } from "@/lib/formato";
import type { VisaoEntidade } from "@/lib/tipos";

const RÓTULO_VISAO: Record<VisaoEntidade, string> = {
  consolidado: "Patrimônio consolidado",
  familia: "Patrimônio da Família",
};

export function HeroPatrimonio({
  visao,
  valor,
}: {
  visao: VisaoEntidade;
  valor: number;
}) {
  return (
    <div className="mb-8">
      <p className="text-sm text-text-secondary">{RÓTULO_VISAO[visao]}</p>
      <p className="mt-1 font-serif text-5xl font-medium text-text-primary">
        {moedaBRL(valor)}
      </p>
    </div>
  );
}
