import { Card } from "@/components/ui/card";
import { FormMeta } from "@/components/metas/form-meta";

export default function NovaMeta() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        Nova meta
      </h1>
      <Card>
        <FormMeta />
      </Card>
    </div>
  );
}
