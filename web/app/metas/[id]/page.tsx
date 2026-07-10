import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FormMeta, type Meta } from "@/components/metas/form-meta";
import { createClient } from "@/lib/supabase/server";

export default async function EditarMeta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("fm_metas_okrs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const meta = data as Meta;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
        {meta.objetivo}
      </h1>
      <Card>
        <FormMeta meta={meta} />
      </Card>
    </div>
  );
}
