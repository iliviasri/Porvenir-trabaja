import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { CategoryForm, MatchConfigForm } from "@/components/forms/admin-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMatchConfig } from "@/lib/match-data";
import { SCORE_DISCLAIMER } from "@/lib/matching";

export const metadata = { title: "Sectores y matching" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole("admin", "/admin/categorias");
  const supabase = await createClient();
  const [{ data: cats }, cfg] = await Promise.all([supabase.from("job_categories").select("*").order("sort_order"), getMatchConfig(supabase)]);
  return (
    <>
      <PageHeader title="Sectores y matching" />
      <Card><CardHeader><CardTitle>Pesos del match laboral (v{cfg.version})</CardTitle></CardHeader><CardContent className="space-y-3">
        <Alert variant="info">{SCORE_DISCLAIMER} El algoritmo no usa edad, sexo, estado civil, origen ni otros atributos sensibles.</Alert>
        <MatchConfigForm weights={cfg.weights as unknown as Record<string, number>} /></CardContent></Card>
      <Card className="mt-6"><CardHeader><CardTitle>Sectores / categorías</CardTitle></CardHeader><CardContent className="space-y-3">
        {(cats ?? []).map((c: any) => <CategoryForm key={c.id} id={c.id} name={c.name} sort={c.sort_order} active={c.active} />)}
        <hr /><p className="font-medium">Agregar sector</p><CategoryForm name="" sort={100} active />
      </CardContent></Card>
    </>
  );
}
