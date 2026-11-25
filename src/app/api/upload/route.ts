import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/auth";
import { validateUpload, sanitizeFileName } from "@/lib/files";
import { getMyBusiness, refreshBusinessStatus } from "@/lib/business";
import { notifyAdmins } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

/** Subida segura de CV (trabajador) y documentos de verificación (negocio) a buckets PRIVADOS de Supabase Storage. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("file");
  if ((kind !== "cv" && kind !== "business-doc") || !(file instanceof File)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const auth = await authorize(kind === "cv" ? "worker" : "business");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!(await rateLimit(`upload:${auth.user.id}`, 20, 3600))) return NextResponse.json({ error: "Demasiadas subidas. Inténtalo más tarde." }, { status: 429 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(kind, { name: file.name, type: file.type, size: file.size }, bytes);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const supabase = await createClient();
  if (kind === "cv") {
    const { data: wp } = await supabase.from("worker_profiles").select("cv_path").eq("user_id", auth.user.id).maybeSingle();
    const path = `${auth.user.id}/cv-${randomUUID()}.pdf`;
    const { error } = await supabase.storage.from("worker-cvs").upload(path, bytes, { contentType: check.mime, upsert: false });
    if (error) { logError("upload.cv", error); return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 }); }
    await supabase.from("worker_profiles").update({ cv_path: path, cv_uploaded_at: new Date().toISOString() }).eq("user_id", auth.user.id);
    if (wp?.cv_path) await supabase.storage.from("worker-cvs").remove([wp.cv_path]);
    return NextResponse.json({ ok: true, message: "CV subido correctamente." });
  }

  const business = await getMyBusiness(supabase, auth.user.id);
  if (!business) return NextResponse.json({ error: "Primero registra tu negocio." }, { status: 400 });
  if (business.status === "suspendido") return NextResponse.json({ error: "Tu negocio está suspendido." }, { status: 403 });
  const label = String(form?.get("doc_label") ?? "").trim().slice(0, 120);
  if (label.length < 2) return NextResponse.json({ error: "Indica qué documento es." }, { status: 400 });
  const reqId = String(form?.get("requirement_id") ?? "");

  const path = `${business.id}/${randomUUID()}.${check.ext}`;
  const { error: upErr } = await supabase.storage.from("business-docs").upload(path, bytes, { contentType: check.mime, upsert: false });
  if (upErr) { logError("upload.doc", upErr); return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 }); }
  const { error: dbErr } = await supabase.from("business_documents").insert({
    business_id: business.id, requirement_id: /^[0-9a-f-]{36}$/i.test(reqId) ? reqId : null, doc_label: label, file_path: path,
    original_name: sanitizeFileName(file.name), mime_type: check.mime, size_bytes: file.size, status: "presentado", uploaded_by: auth.user.id,
  });
  if (dbErr) {
    await supabase.storage.from("business-docs").remove([path]);
    return NextResponse.json({ error: "No se pudo registrar el documento." }, { status: 500 });
  }
  await refreshBusinessStatus(supabase, business.id);
  await audit(auth.user.id, "document.upload", "business", business.id, { label });
  await notifyAdmins("Documento por revisar", `${business.trade_name}: ${label}`, "/admin/verificaciones");
  return NextResponse.json({ ok: true, message: "Documento enviado a revisión." });
}
