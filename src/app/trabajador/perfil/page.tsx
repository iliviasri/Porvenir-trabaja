import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteExperienceButton, ExperienceForm, WorkerProfileForm } from "@/components/forms/worker-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { WorkerProfileInput } from "@/lib/validators";

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireRole("worker", "/trabajador/perfil");
  const supabase = await createClient();
  const [{ data: wp }, { data: ws }, { data: exps }, { data: sectors }, { data: catalog }] = await Promise.all([
    supabase.from("worker_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("worker_skills").select("skills(name)").eq("worker_id", user.id),
    supabase.from("worker_experiences").select("*, job_categories(name)").eq("worker_id", user.id).order("created_at", { ascending: false }),
    supabase.from("job_categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("skills").select("name").order("name").limit(200),
  ]);
  const defaults: WorkerProfileInput = {
    full_name: user.fullName, phone: user.phone ?? "", headline: wp?.headline ?? "", bio: wp?.bio ?? "", main_sector_id: wp?.main_sector_id ?? "",
    availability: wp?.availability ?? "inmediata", schedule_pref: wp?.schedule_pref ?? [], modality_pref: wp?.modality_pref?.length ? wp.modality_pref : ["presencial"],
    expected_salary_min: wp?.expected_salary_min != null ? String(Number(wp.expected_salary_min)) : "", expected_salary_max: wp?.expected_salary_max != null ? String(Number(wp.expected_salary_max)) : "",
    years_experience: String(Number(wp?.years_experience ?? 0)), travel_ok: !!wp?.travel_ok, visible_to_employers: !!wp?.visible_to_employers,
    skills: (ws ?? []).map((s: any) => s.skills?.name).filter(Boolean).join(", "),
  };
  return (
    <>
      <PageHeader title="Mi perfil laboral" description="Mientras más completo, mejores recomendaciones recibirás. Solo pedimos datos laborales." />
      <Card><CardContent className="pt-5"><WorkerProfileForm defaults={defaults} sectors={sectors ?? []} skillSuggestions={(catalog ?? []).map((s: any) => s.name)} /></CardContent></Card>

      <section className="mt-8 space-y-4">
        <h2 className="text-2xl">Mi experiencia</h2>
        {exps && exps.length > 0 ? (
          <ul className="space-y-3">{exps.map((e: any) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div><p className="font-semibold">{e.role_title}</p>
                <p className="text-sm text-muted-foreground">{[e.company, e.job_categories?.name, e.months ? `${Math.floor(e.months / 12) ? `${Math.floor(e.months / 12)} año(s)` : ""} ${e.months % 12 ? `${e.months % 12} mes(es)` : ""}`.trim() : ""].filter(Boolean).join(" · ")}</p>
                {e.description && <p className="mt-1">{e.description}</p>}</div>
              <DeleteExperienceButton id={e.id} />
            </li>))}</ul>
        ) : <p className="text-muted-foreground">Todavía no agregaste experiencia. También puedes crearla desde «Mi CV inteligente».</p>}
        <ExperienceForm sectors={sectors ?? []} />
      </section>
    </>
  );
}
