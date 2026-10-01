import Link from "next/link";
import { connection } from "next/server";
import { Card } from "@/components/ui/card";
import { SubirNotas } from "@/components/financeiro/subir-notas";
import { envioConfigurado } from "@/lib/fm/email-nf";

export const metadata = { title: "Subir NFS-e" };

// Subir as NFS-e do mês: guarda o PDF original, lança a nota e manda o
// e-mail pra Marta (IBVET + IEA juntas), igual ao que a Franciele faz.
export default async function PaginaSubirNotas() {
  // Lê GMAIL_* a cada acesso, não no build (a variável pode entrar depois).
  await connection();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink">Subir NFS-e</h1>
          <p className="text-sm text-ink-faint">
            Sobe o PDF emitido no Emissor Nacional — o Portal lê, guarda, lança a nota e manda o e-mail
          </p>
        </div>
        <Link href="/financeiro" className="text-sm text-ink-faint hover:text-ink">
          ← Voltar
        </Link>
      </div>
      <Card>
        <SubirNotas envioConfigurado={envioConfigurado()} />
      </Card>
    </div>
  );
}
