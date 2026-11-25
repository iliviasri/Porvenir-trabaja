import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Descarga segura mediante URL firmada de 60 s. La AUTORIZACIÓN se decide con RLS:
 * si el usuario puede leer la fila (CV propio, postulante autorizado, documento del propio negocio, administrador),
 * recién entonces el servidor firma la URL con la clave de servicio.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const supabase = await createClient();
  let bucket: string;
  let path: string | null = null;
  let ownerOnly = true;

  if (kind === "cv") {
    bucket = "worker-cvs";
    const { data } = await supabase.from("worker_profiles").select("cv_path").eq("user_id", id).maybeSingle();
    path = data?.cv_path ?? null;
    ownerOnly = id === user.id;
  } else if (kind === "doc") {
    bucket = "business-docs";
    const { data } = await supabase.from("business_documents").select("file_path, uploaded_by").eq("id", id).maybeSingle();
    path = data?.file_path ?? null;
    ownerOnly = data?.uploaded_by === user.id;
  } else {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  if (!path) return NextResponse.json({ error: "Archivo no encontrado o sin permiso." }, { status: 404 });

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !signed) return NextResponse.json({ error: "No se pudo generar el enlace." }, { status: 500 });
  if (!ownerOnly) await audit(user.id, "file.access", kind, id);
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "cache-control": "private, no-store" } });
}
