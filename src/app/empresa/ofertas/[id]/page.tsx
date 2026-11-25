import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { JobForm } from "@/components/forms/business-forms";
import { requireBusinessPage } from "@/lib/business-page";
import type { JobInput } from "@/lib/validators";

export const metadata = { title: "Editar oferta" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, business } = await requireBusinessPage(`/empresa/ofertas/${id}`);
  const [{ data: job }, { data: categories }] = await Promise.all([
    supabase.from("job_offers").select("*, job_required_skills(skills(name))").eq("id", id).eq("business_id", business.id).maybeSingle(),
    supabase.from("job_categories").select("id, name").eq("active", true).order("sort_order"),
  ]);
  if (!job) notFound();
  const defaults: JobInput = {
    title: job.title, description: job.description, category_id: job.category_id ?? "", offer_type: job.offer_type,
    skills: (job.job_required_skills ?? []).map((r: any) => r.skills?.name).filter(Boolean).join(", "),
    salary_min: job.salary_min != null ? String(Number(job.salary_min)) : "", salary_max: job.salary_max != null ? String(Number(job.salary_max)) : "",
    schedule_type: job.schedule_type, schedule_text: job.schedule_text ?? "", modality: job.modality, experience_min_years: String(Number(job.experience_min_years)),
    vacancies: job.vacancies, address: job.address, closes_at: job.closes_at ?? "", submit_for_review: true,
  };
  return (<><PageHeader title="Editar oferta" /><Card><CardContent className="pt-5"><JobForm jobId={id} defaults={defaults} categories={categories ?? []} isActive={job.status === "activa"} /></CardContent></Card></>);
}
