"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize, type ActionResult } from "@/lib/auth";
import { firstIssue, fieldErrors, knowledgeSchema, requirementSchema } from "@/lib/validators";
import { parseRule } from "@/lib/formalization";
import { checkOfferContent } from "@/lib/offer-safety";
import { normalizeWeights } from "@/lib/matching";
import { audit } from "@/lib/audit";
import { notify, notifyBusinessMembers } from "@/lib/notifications";
import { slugify } from "@/lib/utils";
import { label } from "@/lib/constants";
import { logError } from "@/lib/logger";

const uuid = z.string().uuid();

/* ------------------------------ Ofertas ------------------------------ */
export async function moderateJob(jobId: string, decision: "aprobar" | "rechazar" | "suspender" | "reactivar", notes: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!uuid.safeParse(jobId).success) return { ok: false, error: "Oferta inválida." };
  if ((decision === "rechazar" || decision === "suspender") && notes.trim().length < 5) return { ok: false, error: "Indica el motivo (mínimo 5 caracteres)." };
  const supabase = await createClient();

  const { data: job } = await supabase.from("job_offers").select("id, title, description, offer_type, schedule_text, business_id, businesses(status, trade_name)").eq("id", jobId).maybeSingle();
  if (!job) return { ok: false, error: "Oferta no encontrada." };

  if (decision === "aprobar" || decision === "reactivar") {
    if ((job as any).businesses?.status === "suspendido") return { ok: false, error: "El negocio está suspendido." };
    const safety = checkOfferContent({ title: job.title, description: job.description, offer_type: job.offer_type, schedule_text: job.schedule_text ?? "" });
    if (safety.blocked.length) return { ok: false, error: "No se puede aprobar: " + safety.blocked.join(" ") };
  }
  const status = { aprobar: "activa", reactivar: "activa", rechazar: "rechazada", suspender: "suspendida" }[decision];
  const { error } = await supabase.from("job_offers").update({
    status, moderation_notes: notes.trim() || null, moderated_by: auth.user.id, ...(status === "activa" ? { published_at: new Date().toISOString() } : {}),
  }).eq("id", jobId);
  if (error) { logError("admin.moderate", error); return { ok: false, error: "No se pudo actualizar la oferta." }; }

  await audit(auth.user.id, `job.${decision}`, "job_offer", jobId, { notes });
  await notifyBusinessMembers(job.business_id, `Tu oferta fue ${label(status).toLowerCase()}`, `«${job.title}»${notes ? `: ${notes}` : ""}`, "/empresa/ofertas");
  revalidatePath("/admin/ofertas");
  revalidatePath("/empleos");
  return { ok: true, message: `Oferta ${label(status).toLowerCase()}.` };
}

/* ------------------------- Documentos y verificación ------------------------- */
export async function reviewDocument(docId: string, status: "aprobado" | "observado", notes: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!uuid.safeParse(docId).success) return { ok: false, error: "Documento inválido." };
  if (status === "observado" && notes.trim().length < 5) return { ok: false, error: "Explica qué debe corregir el negocio." };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("business_documents").select("id, business_id, doc_label").eq("id", docId).maybeSingle();
  if (!doc) return { ok: false, error: "Documento no encontrado." };
  const { error } = await supabase.from("business_documents").update({ status, review_notes: notes.trim() || null, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() }).eq("id", docId);
  if (error) return { ok: false, error: "No se pudo registrar la revisión." };
  await audit(auth.user.id, `document.${status}`, "business_document", docId, { notes });
  await notifyBusinessMembers(doc.business_id, `Documento ${status}`, `«${doc.doc_label}»${notes ? `: ${notes}` : ""}`, "/empresa/documentos");
  revalidatePath("/admin/verificaciones");
  return { ok: true, message: `Documento marcado como ${status}.` };
}

export async function setBusinessStatus(businessId: string, status: string, notes: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const allowed = ["registrado", "en_orientacion", "en_proceso_formalizacion", "documentacion_en_revision", "documentacion_verificada", "suspendido"];
  if (!uuid.safeParse(businessId).success || !allowed.includes(status)) return { ok: false, error: "Datos inválidos." };
  if ((status === "suspendido" || status === "documentacion_verificada") && notes.trim().length < 5) return { ok: false, error: "Agrega una observación (mínimo 5 caracteres)." };
  const supabase = await createClient();

  const { data: biz } = await supabase.from("businesses").select("id, status, trade_name").eq("id", businessId).maybeSingle();
  if (!biz) return { ok: false, error: "Negocio no encontrado." };
  if (status === "documentacion_verificada") {
    const { data: docs } = await supabase.from("business_documents").select("status").eq("business_id", businessId);
    if (!docs?.some((d: any) => d.status === "aprobado")) return { ok: false, error: "Para verificar la documentación debe existir al menos un documento aprobado." };
    if (docs.some((d: any) => d.status === "presentado")) return { ok: false, error: "Aún hay documentos pendientes de revisión." };
  }
  const { error } = await supabase.from("businesses").update({ status, admin_notes: notes.trim() || null }).eq("id", businessId);
  if (error) return { ok: false, error: "No se pudo actualizar el negocio." };
  await supabase.from("business_verifications").insert({ business_id: businessId, from_status: biz.status, to_status: status, notes: notes.trim() || null, reviewed_by: auth.user.id });
  await audit(auth.user.id, "business.status", "business", businessId, { from: biz.status, to: status, notes });
  await notifyBusinessMembers(businessId, "Estado de tu negocio actualizado", `${label(status)}${notes ? `: ${notes}` : ""}`, "/empresa/ruta");
  revalidatePath("/admin/empresas");
  revalidatePath("/admin/verificaciones");
  return { ok: true, message: `Estado: ${label(status)}.` };
}

/** Marca el RUC como verificado SOLO citando la fuente utilizada (ej. constancia o consulta oficial revisada). */
export async function verifyRuc(businessId: string, source: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!uuid.safeParse(businessId).success || source.trim().length < 8) return { ok: false, error: "Indica la fuente de verificación (mínimo 8 caracteres)." };
  const supabase = await createClient();
  const { data: biz } = await supabase.from("businesses").select("ruc").eq("id", businessId).maybeSingle();
  if (!biz?.ruc) return { ok: false, error: "El negocio no declaró un RUC." };
  const { error } = await supabase.from("businesses").update({ ruc_verified: true, ruc_verified_at: new Date().toISOString(), ruc_verified_source: source.trim().slice(0, 300) }).eq("id", businessId);
  if (error) return { ok: false, error: "No se pudo registrar la verificación." };
  await audit(auth.user.id, "business.ruc_verified", "business", businessId, { source });
  revalidatePath("/admin/empresas");
  return { ok: true, message: "RUC marcado como verificado (registro interno con fuente citada)." };
}

/* ------------------------------ Usuarios ------------------------------ */
export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Usuario inválido." };
  if (userId === auth.user.id) return { ok: false, error: "No puedes desactivar tu propia cuenta." };
  const admin = createAdminClient();
  const { error: e1 } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  const { error: e2 } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  if (e1 || e2) { logError("admin.setActive", e1 ?? e2); return { ok: false, error: "No se pudo actualizar la cuenta." }; }
  await audit(auth.user.id, active ? "user.activate" : "user.deactivate", "user", userId);
  revalidatePath("/admin/usuarios");
  return { ok: true, message: active ? "Cuenta activada." : "Cuenta desactivada." };
}

export async function setUserRole(userId: string, role: "worker" | "business" | "admin", grant: boolean): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!uuid.safeParse(userId).success || !["worker", "business", "admin"].includes(role)) return { ok: false, error: "Datos inválidos." };
  if (userId === auth.user.id && role === "admin" && !grant) return { ok: false, error: "No puedes quitarte el rol de administrador." };
  const admin = createAdminClient();
  const q = grant ? admin.from("user_roles").upsert({ user_id: userId, role }) : admin.from("user_roles").delete().eq("user_id", userId).eq("role", role);
  const { error } = await q;
  if (error) return { ok: false, error: "No se pudo cambiar el rol." };
  await audit(auth.user.id, grant ? "role.grant" : "role.revoke", "user", userId, { role });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: grant ? "Rol concedido." : "Rol retirado." };
}

/** Ejecuta una solicitud de eliminación (Ley 29733): borra cuenta, archivos y datos en cascada. */
export async function deleteUserData(userId: string, requestId?: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Usuario inválido." };
  if (userId === auth.user.id) return { ok: false, error: "No puedes eliminar tu propia cuenta de administrador." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if (target?.some((r: any) => r.role === "admin")) return { ok: false, error: "Quita primero el rol de administrador a esta cuenta." };

  try {
    const { data: cvs } = await admin.storage.from("worker-cvs").list(userId);
    if (cvs?.length) await admin.storage.from("worker-cvs").remove(cvs.map((f) => `${userId}/${f.name}`));
    const { data: bizs } = await admin.from("businesses").select("id").eq("owner_id", userId);
    for (const b of bizs ?? []) {
      const { data: files } = await admin.storage.from("business-docs").list(b.id);
      if (files?.length) await admin.storage.from("business-docs").remove(files.map((f) => `${b.id}/${f.name}`));
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  } catch (e) {
    logError("admin.deleteUser", e);
    return { ok: false, error: "No se pudo eliminar la cuenta." };
  }
  await audit(auth.user.id, "user.delete_data", "user", userId, { privacy_request: requestId ?? null });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Cuenta y datos eliminados." };
}

export async function resolvePrivacyRequest(id: string, status: "en_proceso" | "atendida" | "rechazada", note: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Solicitud inválida." };
  const supabase = await createClient();
  const { data: reqRow } = await supabase.from("privacy_requests").select("user_id, type").eq("id", id).maybeSingle();
  const { error } = await supabase.from("privacy_requests").update({ status, resolution_note: note.trim() || null, resolved_at: status === "en_proceso" ? null : new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la solicitud." };
  await audit(auth.user.id, "privacy.resolve", "privacy_request", id, { status });
  if (reqRow) await notify(reqRow.user_id, "Tu solicitud de privacidad fue actualizada", `Estado: ${label(status)}${note ? `. ${note}` : ""}`, "/cuenta/privacidad");
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Solicitud actualizada." };
}

/* ------------------- Catálogo de requisitos (versionado) ------------------- */
export async function saveRequirement(input: unknown): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = requirementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const rule = parseRule(v.applies_when);
  if (!rule.ok) return { ok: false, error: rule.error, fieldErrors: { applies_when: rule.error } };
  const documents = v.documents.split("\n").map((s) => s.trim()).filter(Boolean);
  const supabase = await createClient();

  const base = {
    code: v.code, category: v.category, title: v.title, summary: v.summary, plain_explanation: v.plain_explanation, documents,
    applies_when: rule.rule, caveats: v.caveats || null, source_label: v.source_label, source_url: v.source_url || null,
    sort_order: v.sort_order, last_reviewed_at: new Date().toISOString().slice(0, 10),
  };
  if (v.id) {
    // Versionado: se crea una nueva versión y se desactiva la anterior (las tareas existentes conservan su versión).
    const { data: old } = await supabase.from("formalization_requirements").select("code").eq("id", v.id).maybeSingle();
    const { data: maxV } = await supabase.from("formalization_requirements").select("version").eq("code", old?.code ?? v.code).order("version", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("formalization_requirements").insert({ ...base, code: old?.code ?? v.code, version: (maxV?.version ?? 0) + 1, active: v.active });
    if (error) return { ok: false, error: "No se pudo crear la nueva versión." };
    await supabase.from("formalization_requirements").update({ active: false }).eq("id", v.id);
    await audit(auth.user.id, "requirement.new_version", "requirement", v.id, { code: v.code });
  } else {
    const { error } = await supabase.from("formalization_requirements").insert({ ...base, version: 1, active: v.active });
    if (error) return { ok: false, error: error.code === "23505" ? "Ya existe un requisito con ese código." : "No se pudo crear el requisito." };
    await audit(auth.user.id, "requirement.create", "requirement", null, { code: v.code });
  }
  revalidatePath("/admin/requisitos");
  return { ok: true, message: "Requisito guardado (nueva versión vigente)." };
}

export async function toggleRequirement(id: string, active: boolean): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.from("formalization_requirements").update({ active }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  await audit(auth.user.id, active ? "requirement.activate" : "requirement.deactivate", "requirement", id);
  revalidatePath("/admin/requisitos");
  return { ok: true };
}

/* ------------------------- Fuentes de conocimiento ------------------------- */
export async function saveKnowledge(input: unknown): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = knowledgeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const row = { title: v.title, content: v.content, category: v.category, url: v.url || null, is_official: v.is_official, active: v.active, last_updated: new Date().toISOString().slice(0, 10) };
  const { error } = v.id
    ? await supabase.from("knowledge_sources").update(row).eq("id", v.id)
    : await supabase.from("knowledge_sources").insert({ ...row, created_by: auth.user.id });
  if (error) return { ok: false, error: "No se pudo guardar la fuente." };
  await audit(auth.user.id, v.id ? "knowledge.update" : "knowledge.create", "knowledge_source", v.id ?? null, { title: v.title });
  revalidatePath("/admin/requisitos");
  return { ok: true, message: "Fuente guardada." };
}

/* ------------------------------ Categorías ------------------------------ */
export async function saveCategory(name: string, sortOrder: number, active: boolean, id?: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const n = name.trim();
  if (n.length < 3 || n.length > 60) return { ok: false, error: "El nombre debe tener entre 3 y 60 caracteres." };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("job_categories").update({ name: n, sort_order: sortOrder, active }).eq("id", id)
    : await supabase.from("job_categories").insert({ name: n, slug: slugify(n), sort_order: sortOrder, active });
  if (error) return { ok: false, error: error.code === "23505" ? "Ya existe una categoría con ese nombre." : "No se pudo guardar." };
  await audit(auth.user.id, id ? "category.update" : "category.create", "job_category", id ?? null, { name: n, active });
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Categoría guardada." };
}

export async function updateMatchConfig(weights: Record<string, number>): Promise<ActionResult> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const keys = ["skills", "experience", "availability", "location_modality", "preferences"];
  for (const k of keys) {
    const n = Number(weights[k]);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, error: "Cada ponderación debe estar entre 0 y 100." };
  }
  if (keys.every((k) => Number(weights[k]) === 0)) return { ok: false, error: "Al menos una ponderación debe ser mayor que 0." };
  const supabase = await createClient();
  const { data: cur } = await supabase.from("matching_config").select("version").eq("id", 1).maybeSingle();
  const { error } = await supabase.from("matching_config").update({ weights: normalizeWeights(weights), version: (cur?.version ?? 1) + 1, updated_by: auth.user.id, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { ok: false, error: "No se pudo guardar la configuración." };
  await audit(auth.user.id, "matching.config", "matching_config", "1", { weights });
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Ponderaciones actualizadas." };
}
