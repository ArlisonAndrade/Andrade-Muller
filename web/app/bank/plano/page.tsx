export const metadata = { title: "Plano" };

// Stub da Fase 0 — vira o plano R$ 6M interativo (curva 2025→2049,
// simulador, marcos) na Fase 6.
export default function PaginaPlano() {
  return (
    <div className="card-bank p-6">
      <h1 className="text-lg font-semibold">Plano patrimonial</h1>
      <p className="mt-2 text-sm text-text-secondary">
        O plano dos R$ 6 milhões — curva até 2049, simulador de aportes e
        marcos de patrimônio — chega em breve.
      </p>
    </div>
  );
}
