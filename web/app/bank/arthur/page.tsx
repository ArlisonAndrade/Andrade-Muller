export const metadata = { title: "Carteira Arthur" };

// Stub da Fase 0 — vira a página da Carteira do Arthur (projeção
// nascimento→18/20 anos, aportes de aniversário, marcos) na Fase 6.
export default function PaginaArthur() {
  return (
    <div className="card-bank p-6">
      <h1 className="text-lg font-semibold">Carteira do Arthur</h1>
      <p className="mt-2 text-sm text-text-secondary">
        A página dedicada do Arthur — projeção até os 18 anos, aportes de
        aniversário e marcos — chega em breve. O patrimônio dele continua
        visível na página inicial.
      </p>
    </div>
  );
}
