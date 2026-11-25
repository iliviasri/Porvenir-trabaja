"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authorize, type ActionResult } from "@/lib/auth";
import { applySchema, cvDataSchema, experienceSchema, fieldErrors, firstIssue, toNum, workerProfileSchema } from "@/lib/validators";
import { parseSkillList } from "@/lib/utils";
import { syncWorkerSkills } from "@/lib/skills";
import { computeMatch } from "@/lib/matching";
import { getMatchConfig, jobRowToMatchJob, loadMatchWorker, JOB_MATCH_SELECT } from "@/lib/match-data";
import { notify, notifyBusinessMembers } from "@/lib/notifications";
import { logError } from "@/lib/logger";

export async function saveWorkerProfile(input: unknown): Promise<ActionResult> {
  const auth = await authorize("worker");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = workerProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  const { error: e1 } = await supabase.from("profiles").update({ full_name: v.full_name, phone: v.phone || null }).eq("id", auth.user.id);
  const { error: e2 } = await supabase
    .from("worker_profiles")
    .update({
      headline: v.headline || null,
      bio: v.bio || null,
      main_sector_id: v.main_sector_id || null,
      availability: v.availability,
      schedule_pref: v.schedule_pref,
      modality_pref: v.modality_pref,
      expected_salary_min: toNum(v.expected_salary_min),
      expected_salary_max: toNum(v.expected_salary_max),
      years_experience: Number(v.years_experience),
      travel_ok: v.travel_ok,
      visible_to_employers: v.visible_to_employers,
    })
    .eq("user_id", auth.user.id);
  if (e1 || e2) {
    logError("worker.profile.save", e1 ?? e2);
    return { ok: false, error: "No se pudo guardar tu perfil. Inténtalo de nuevo." };
  }
  await syncWorkerSkills(supabase, auth.user.id, parseSkillList(v.skills));
  revalidatePath("/trabajador", "layout");
  return { ok: true, message: "Perfil guardado correctamente." };
}

export async function addExperience(input: unknown): Promise<ActionResult> {
  const auth = await authorize("worker");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const months = Number(v.years || 0) * 12 + Number(v.months || 0);
  const supabase = await createClient();
  const { error } = await supabase.from("worker_experiences").insert({
    worker_id: auth.user.id, role_title: v.role_title, company: v.company || null, sector_id: v.sector_id || null, months, description: v.description || null,
  });
  if (error) return { ok: false, error: "No se pudo agregar la experiencia." };
  revalidatePath("/trabajador/perfil");
  return { ok: true, message: "Experiencia agregada." };
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  const auth = await authorize("worker");
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.from("worker_experiences").delete().eq("id", id).eq("worker_id", auth.user.id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidatePath("/trabajador/perfil");
  return { ok: true };
}

/** Guarda los datos que el trabajador REVISÓ y CONFIRMÓ en CV Inteligente. */
export async function saveCvData(input: unknown): Promise<ActionResult> {
  const auth = await authorize("worker");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = cvDataSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  const { data: current } = await supabase.from("worker_profiles").select("years_experience").eq("user_id", auth.user.id).maybeSingle();
  const totalMonths = v.experiences.reduce((a, e) => a + e.months, 0);
  const years = Math.max(Number(current?.years_experience ?? 0), Math.round((totalMonths / 12) * 10) / 10);

  const { error } = await supabase
    .from("worker_profiles")
    .update({ headline: v.headline || null, bio: v.summary || null, years_experience: Math.min(years, 60), cv_generated_data: { skills: v.skills, experiences: v.experiences, confirmed_at: new Date().toISOString() } })
    .eq("user_id", auth.user.id);
  if (error) return { ok: false, error: "No se pudo guardar tu CV." };

  await syncWorkerSkills(supabase, auth.user.id, v.skills, { merge: true });
  // Reemplaza solo las experiencias que provienen del CV inteligente (marcadas con prefijo en descripción no es necesario: se reemplazan todas si el usuario las confirmó)
  if (v.experiences.length) {
    await supabase.from("worker_experiences").delete().eq("worker_id", auth.user.id);
    await supabase.from("worker_experiences").insert(
      v.experiences.map((e) => ({ worker_id: auth.user.id, role_title: e.role_title, company: e.company || null, months: e.months, description: e.description || null })),
    );
  }
  revalidatePath("/trabajador", "layout");
  return { ok: true, message: "CV guardado. Ya puedes descargarlo en PDF." };
}

export async function toggleSaveJob(jobId: string): Promise<ActionResult<{ saved: boolean }>> {
  const auth = await authorize("worker");
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("saved_jobs").select("job_id").eq("user_id", auth.user.id).eq("job_id", jobId).maybeSingle();
  if (existing) {
    await supabase.from("saved_jobs").delete().eq("user_id", auth.user.id).eq("job_id", jobId);
    revalidatePath("/trabajador/guardadas");
    return { ok: true, data: { saved: false } };
  }
  const { error } = await supabase.from("saved_jobs").insert({ user_id: auth.user.id, job_id: jobId });
  if (error) return { ok: false, error: "No se pudo guardar la oferta." };
  revalidatePath("/trabajador/guardadas");
  return { ok: true, data: { saved: true } };
}

export async function applyToJob(input: unknown): Promise<ActionResult> {
  const auth = await authorize("worker");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { job_id, cover_note } = parsed.data;
  const supabase = await createClient();

  const { data: job } = await supabase.from("job_offers").select(JOB_MATCH_SELECT).eq("id", job_id).eq("status", "activa").maybeSingle();
  if (!job) return { ok: false, error: "Esta oferta ya no está disponible." };
  if (job.closes_at && job.closes_at < new Date().toISOString().slice(0, 10)) return { ok: false, error: "La convocatoria ya cerró." };

  const [worker, cfg] = await Promise.all([loadMatchWorker(supabase, auth.user.id), getMatchConfig(supabase)]);
  const match = worker ? computeMatch(worker, jobRowToMatchJob(job), cfg.weights) : null;

  const { error } = await supabase.from("applications").insert({
    job_id, worker_id: auth.user.id, cover_note: cover_note || null, consent_share_profile: true,
    match_score: match?.score ?? null, match_detail: match ? { ...match, config_version: cfg.version } : null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya postulaste a esta oferta." };
    logError("worker.apply", error);
    return { ok: false, error: "No se pudo enviar tu postulación." };
  }
  await notify(auth.user.id, "Postulación enviada", `Postulaste a «${job.title}».`, "/trabajador/postulaciones");
  await notifyBusinessMembers(job.business_id, "Nueva postulación", `${auth.user.fullName || "Un postulante"} postuló a «${job.title}».`, "/empresa/candidatos");
  revalidatePath("/trabajador/postulaciones");
  return { ok: true, message: "¡Postulación enviada! Puedes ver su estado en «Mis postulaciones»." };
}

export async function withdrawApplication(id: string): Promise<ActionResult> {
  const auth = await authorize("worker");
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("id", id).eq("worker_id", auth.user.id).eq("status", "enviada");
  if (error) return { ok: false, error: "No se pudo retirar la postulación." };
  revalidatePath("/trabajador/postulaciones");
  return { ok: true, message: "Postulación retirada." };
}
