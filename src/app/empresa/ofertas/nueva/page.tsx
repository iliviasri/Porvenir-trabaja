import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { JobForm } from "@/components/forms/business-forms";
import { requireBusinessPage } from "@/lib/business-page";
import type { JobInput } from "@/lib/validators";

export const metadata = { title: "Nueva oferta" };

export default async function NewJobPage() {
  const { supabase, business } = await requireBusinessPage("/empresa/ofertas/nueva");
  const { data: categories } = await supabase.from("job_categories").select("id, name").eq("active", true).order("sort_order");
  const defaults: JobInput = {
    title: "", description: "", category_id: business.sector_id ?? "", offer_type: "empleo_dependiente", skills: "", salary_min: "", salary_max: "",
    schedule_type: "tiempo_completo", schedule_text: "", modality: "presencial", experience_min_years: "0", vacancies: 1, address: business.address ?? "", closes_at: "", submit_for_review: true,
  };
  return (<><PageHeader title="Nueva oferta laboral" description="Ubicación exclusiva: El Porvenir. Se revisará antes de publicarse." /><Card><CardContent className="pt-5"><JobForm jobId={null} defaults={defaults} categories={categories ?? []} /></CardContent></Card></>);
}
