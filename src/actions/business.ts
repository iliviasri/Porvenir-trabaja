"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authorize, type ActionResult } from "@/lib/auth";
import { businessSchema, diagnosticAnswersSchema, fieldErrors, firstIssue, taskUpdateSchema } from "@/lib/validators";
import { getMyBusiness, refreshBusinessStatus } from "@/lib/business";
import { buildRoute, type Requirement } from "@/lib/formalization";
import { explainRoute } from "@/lib/ai/formaliza";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";

export async function saveBusiness(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  const row = {
    trade_name: v.trade_name, legal_name: v.legal_name || null, ruc: v.ruc || null,
    ruc_declared: v.ruc ? "tiene" : v.ruc_declared, sector_id: v.sector_id || null,
    activity_description: v.activity_description, description: v.description || null, products_services: v.products_services || null,
    premises: v.premises, workers_count: v.workers_count, address: v.address, is_public: v.is_public,
  };
  const existing = await getMyBusiness(supabase, auth.user.id);
  let id: string;
  if (existing) {
    id = existing.id;
    const { error } = await supabase.from("businesses").update(row).eq("id", id);
    if (error) { logError("business.update", error); return { ok: false, error: "No se pudo guardar el negocio." }; }
  } else {
    const { data, error } = await supabase.from("businesses").insert({ ...row, owner_id: auth.user.id }).select("id").single();
    if (error || !data) { logError("business.insert", error); return { ok: false, error: "No se pudo registrar el negocio." }; }
    id = data.id;
  }
  await supabase.from("business_contacts").upsert({
    business_id: id, phone: v.contact_phone || null, whatsapp: v.contact_whatsapp || null,
    email: v.contact_email || null, website: v.contact_website || null, show_public: v.show_contact,
  });
  revalidatePath("/empresa", "layout");
  revalidatePath("/empresas");
  return { ok: true, message: existing ? "Datos del negocio actualizados." : "¡Negocio registrado! Ahora puedes hacer tu diagnóstico de formalización.", data: { id } };
}

/**
 * Guarda el diagnóstico: la RUTA sale del catálogo versionado + reglas verificables.
 * La IA solo redacta la explicación (con plantilla de respaldo si no está configurada).
 */
export async function saveDiagnostic(input: unknown, freeText?: string): Promise<ActionResult<{ diagnosticId: string }>> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = diagnosticAnswersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const answers = parsed.data;
  const supabase = await createClient();

  const business = await getMyBusiness(supabase, auth.user.id);
  if (!business) return { ok: false, error: "Primero registra los datos de tu negocio." };
  if (business.status === "suspendido") return { ok: false, error: "Tu negocio está suspendido. Contacta a la administración." };
  if (!(await rateLimit(`diag:${auth.user.id}`, 10, 3600))) return { ok: false, error: "Hiciste muchos diagnósticos seguidos. Inténtalo más tarde." };

  const { data: reqs } = await supabase.from("formalization_requirements").select("*").eq("active", true);
  const catalog = (reqs ?? []) as Requirement[];
  const { applicable, notApplicable } = buildRoute(catalog, answers);
  const explanation = await explainRoute(business.trade_name, answers, applicable);

  const { data: diag, error } = await supabase
    .from("formalization_diagnostics")
    .insert({
      business_id: business.id, answers, free_text: freeText?.slice(0, 3000) || null, ai_summary: explanation.text, ai_generated: explanation.ai,
      catalog_snapshot: applicable.map((r) => ({ code: r.code, version: r.version })), created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (error || !diag) { logError("diagnostic.insert", error); return { ok: false, error: "No se pudo guardar el diagnóstico." }; }

  // Sincroniza tareas: crea las que faltan, reactiva las aplicables y marca "no aplica" las que no tengan avance.
  const { data: existing } = await supabase.from("formalization_tasks").select("id, requirement_id, status").eq("business_id", business.id);
  const byReq = new Map((existing ?? []).map((t: any) => [t.requirement_id, t]));
  const existingByCode = new Map<string, any>();
  if (existing?.length) {
    const { data: oldReqs } = await supabase.from("formalization_requirements").select("id, code").in("id", existing.map((t: any) => t.requirement_id));
    for (const r of oldReqs ?? []) existingByCode.set(r.code, existing.find((t: any) => t.requirement_id === r.id));
  }
  for (const r of applicable) {
    const t = byReq.get(r.id) ?? existingByCode.get(r.code);
    if (!t) await supabase.from("formalization_tasks").insert({ business_id: business.id, requirement_id: r.id, diagnostic_id: diag.id });
    else if (t.status === "no_aplica") await supabase.from("formalization_tasks").update({ status: "pendiente", diagnostic_id: diag.id }).eq("id", t.id);
  }
  for (const r of notApplicable) {
    const t = byReq.get(r.id) ?? existingByCode.get(r.code);
    if (t && t.status === "pendiente") await supabase.from("formalization_tasks").update({ status: "no_aplica" }).eq("id", t.id);
  }

  await supabase.from("businesses").update({ workers_count: answers.workers_count, premises: answers.premises, ruc_declared: answers.ruc_status }).eq("id", business.id);
  await refreshBusinessStatus(supabase, business.id);
  await audit(auth.user.id, "formalization.diagnostic", "business", business.id, { ai: explanation.ai, tasks: applicable.length });
  revalidatePath("/empresa", "layout");
  return { ok: true, message: "Diagnóstico guardado. Tu ruta de formalización está lista.", data: { diagnosticId: diag.id } };
}

export async function updateTask(input: unknown): Promise<ActionResult> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = taskUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  const { data: task } = await supabase.from("formalization_tasks").select("id, business_id").eq("id", v.task_id).maybeSingle();
  if (!task) return { ok: false, error: "Trámite no encontrado." };
  const { error } = await supabase
    .from("formalization_tasks")
    .update({
      status: v.status, note: v.note || null, due_date: v.due_date || null,
      completed_at: v.status === "completado" ? new Date().toISOString() : null,
    })
    .eq("id", v.task_id);
  if (error) return { ok: false, error: "No se pudo actualizar el trámite." };
  await refreshBusinessStatus(supabase, task.business_id);
  revalidatePath("/empresa", "layout");
  return { ok: true, message: "Trámite actualizado." };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const auth = await authorize("business");
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("business_documents").select("id, file_path, business_id").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, error: "Documento no encontrado." };
  const { error } = await supabase.from("business_documents").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar (los documentos aprobados no se pueden borrar)." };
  await supabase.storage.from("business-docs").remove([doc.file_path]);
  await refreshBusinessStatus(supabase, doc.business_id);
  revalidatePath("/empresa/documentos");
  return { ok: true, message: "Documento eliminado." };
}
