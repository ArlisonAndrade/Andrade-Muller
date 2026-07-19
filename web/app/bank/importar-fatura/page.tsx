import { IconUpload } from "@/components/bank/ui/icones";

export default function ImportarFatura() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="card-borda mx-auto flex flex-col items-center gap-3 bg-surface-2 p-10">
        <IconUpload size={28} stroke={1.5} className="text-text-faint" />
        <p className="font-serif text-xl font-medium text-text-primary">
          Importação de fatura — em construção
        </p>
        <p className="text-sm text-text-secondary">
          O parser de OFX/CSV com categorização automática entra numa próxima etapa.
          Por enquanto, lance os itens da fatura manualmente em{" "}
          <span className="font-medium text-text-primary">Lançamento</span>.
        </p>
      </div>
    </div>
  );
}
