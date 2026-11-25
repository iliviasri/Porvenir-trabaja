"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authorize, type ActionResult } from "@/lib/auth";
import { applicationStatusSchema, fieldErrors, firstIssue, jobSchema, toNum } from "@/lib/validators";
import { getMyBusiness } from "@/lib/business";
import { checkOfferContent } from "@/lib/offer-safety";
import { parseSkillList } from "@/lib/utils";
import { syncJobSkills } from "@/lib/skills";
import { notify, notifyAdmins } from "@/lib/notifications";
import { label } from "@/lib/constants";
import { logError } from "@/lib/logger";

export async function saveJob(jobId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  const business = await getMyBusiness(supabase, auth.user.id);
  if (!business) return { ok: false, error: "Primero registra tu negocio." };
  if (business.status === "suspendido") return { ok: false, error: "Tu negocio está suspendido y no puede publicar ofertas." };

  const safety = checkOfferContent({ title: v.title, description: v.description, offer_type: v.offer_type, schedule_text: v.schedule_text });
  if (safety.blocked.length) return { ok: false, error: safety.blocked.join(" ") };

  const row = {
    title: v.title, description: v.description, category_id: v.category_id, offer_type: v.offer_type,
    salary_min: toNum(v.salary_min), salary_max: toNum(v.salary_max), schedule_type: v.schedule_type, schedule_text: v.schedule_text || null,
    modality: v.modality, experience_min_years: Number(v.experience_min_years), vacancies: v.vacancies, address: v.address,
    closes_at: v.closes_at || null, status: v.submit_for_review ? "pendiente_moderacion" : "borrador",
  };

  let id = jobId;
  if (jobId) {
    const { error } = await supabase.from("job_offers").update(row).eq("id", jobId);
    if (error) return { ok: false, error: error.message.includes("suspendida") ? "La oferta está suspendida; contacta a la administración." : "No se pudo guardar la oferta." };
  } else {
    const { data, error } = await supabase.from("job_offers").insert({ ...row, business_id: business.id, created_by: auth.user.id }).select("id").single();
    if (error || !data) { logError("job.insert", error); return { ok: false, error: "No se pudo crear la oferta." }; }
    id = data.id;
  }
  await syncJobSkills(supabase, id!, parseSkillList(v.skills));
  if (v.submit_for_review) await notifyAdmins("Oferta pendiente de moderación", `«${v.title}» de ${business.trade_name}.`, "/admin/ofertas");
  revalidatePath("/empresa/ofertas");
  return {
    ok: true,
    data: { id: id! },
    message: v.submit_for_review ? "Oferta enviada a moderación. La publicaremos cuando sea aprobada." : "Borrador guardado.",
  };
}

export async function closeJob(jobId: string): Promise<ActionResult> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.from("job_offers").update({ status: "cerrada" }).eq("id", jobId);
  if (error) return { ok: false, error: "No se pudo cerrar la convocatoria." };
  revalidatePath("/empresa/ofertas");
  revalidatePath("/empleos");
  return { ok: true, message: "Convocatoria cerrada." };
}

export async function deleteJob(jobId: string): Promise<ActionResult> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.from("job_offers").delete().eq("id", jobId);
  if (error) return { ok: false, error: "Solo se pueden eliminar borradores o ofertas rechazadas." };
  revalidatePath("/empresa/ofertas");
  return { ok: true, message: "Oferta eliminada." };
}

export async function updateApplicationStatus(input: unknown): Promise<ActionResult> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = applicationStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { application_id, status } = parsed.data;
  const supabase = await createClient();

  const { data: app } = await supabase.from("applications").select("id, worker_id, job_offers(title)").eq("id", application_id).maybeSingle();
  if (!app) return { ok: false, error: "Postulación no encontrada." };
  const { error } = await supabase.from("applications").update({ status }).eq("id", application_id);
  if (error) return { ok: false, error: "No se pudo actualizar el estado." };
  await notify(app.worker_id, "Tu postulación cambió de estado", `«${(app as any).job_offers?.title ?? "Oferta"}»: ${label(status)}.`, "/trabajador/postulaciones");
  revalidatePath("/empresa/candidatos");
  return { ok: true, message: `Estado actualizado: ${label(status)}.` };
}
