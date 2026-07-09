import { Card } from "@/components/ui/card";
import { FormCliente } from "@/components/crm/form-cliente";

export default function NovoCliente() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Novo cliente
      </h1>
      <Card>
        <FormCliente />
      </Card>
    </div>
  );
}
