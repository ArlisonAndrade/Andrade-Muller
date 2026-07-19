export function EstadoSemConfiguracao() {
  return (
    <div className="card-borda mx-auto max-w-lg bg-surface-2 p-8 text-center">
      <p className="font-serif text-xl font-medium text-text-primary">
        Projeto Supabase do Bank ainda não configurado
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        Copie <code className="rounded bg-surface-1 px-1.5 py-0.5">.env.local.example</code>{" "}
        para <code className="rounded bg-surface-1 px-1.5 py-0.5">.env.local</code> e preencha
        com a URL e a chave anônima do MESMO projeto Supabase usado pelo FM Gestão. Depois rode
        as migrations em{" "}
        <code className="rounded bg-surface-1 px-1.5 py-0.5">bank/supabase/migrations</code>{" "}
        no SQL Editor, em ordem.
      </p>
    </div>
  );
}
