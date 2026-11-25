import { PageHeader } from "@/components/layout/dashboard-shell";
import { CvStudio, CvUpload } from "@/components/forms/cv-studio";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { llmConfigured } from "@/lib/ai/llm";
import { transcribeConfigured } from "@/lib/ai/transcribe";

export const metadata = { title: "Mi CV inteligente" };

export default async function CvPage() {
  const user = await requireRole("worker", "/trabajador/cv");
  const supabase = await createClient();
  const [{ data: wp }, { data: ws }, { data: exps }] = await Promise.all([
    supabase.from("worker_profiles").select("headline, bio, cv_path").eq("user_id", user.id).maybeSingle(),
    supabase.from("worker_skills").select("skills(name)").eq("worker_id", user.id),
    supabase.from("worker_experiences").select("role_title, company, months, description").eq("worker_id", user.id).order("created_at"),
  ]);
  return (
    <>
      <PageHeader title="Mi CV inteligente" description="Cuenta tu experiencia con tus palabras, revisa los datos y descarga tu CV en PDF." />
      <div className="space-y-6">
        <CvStudio
          caps={{ llm: llmConfigured(), transcription: transcribeConfigured() }}
          initial={{
            headline: wp?.headline ?? "", summary: wp?.bio ?? "",
            skills: (ws ?? []).map((s: any) => s.skills?.name).filter(Boolean),
            experiences: (exps ?? []).map((e: any) => ({ role_title: e.role_title, company: e.company ?? "", months: e.months, description: e.description ?? "" })),
          }}
        />
        <CvUpload hasCv={!!wp?.cv_path} cvUserId={user.id} />
      </div>
    </>
  );
}
