import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/** Derecho de acceso (Ley N.º 29733): el usuario descarga una copia de sus datos. Todo se lee con RLS, solo datos propios. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const s = await createClient();
  const [profile, worker, skills, exps, apps, saved, notifs, reqs, businesses] = await Promise.all([
    s.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    s.from("worker_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    s.from("worker_skills").select("skills(name)").eq("worker_id", user.id),
    s.from("worker_experiences").select("*").eq("worker_id", user.id),
    s.from("applications").select("id, status, cover_note, match_score, created_at, job_offers(title)").eq("worker_id", user.id),
    s.from("saved_jobs").select("job_id, created_at").eq("user_id", user.id),
    s.from("notifications").select("title, body, created_at").eq("user_id", user.id),
    s.from("privacy_requests").select("type, status, created_at").eq("user_id", user.id),
    s.from("businesses").select("*").eq("owner_id", user.id),
  ]);
  await audit(user.id, "privacy.export", "user", user.id);
  const body = {
    generado: new Date().toISOString(), correo: user.email, perfil: profile.data, perfil_laboral: worker.data,
    habilidades: (skills.data ?? []).map((x: any) => x.skills?.name), experiencias: exps.data, postulaciones: apps.data,
    ofertas_guardadas: saved.data, notificaciones: notifs.data, solicitudes_privacidad: reqs.data, negocios: businesses.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="mis-datos-porvenir-trabaja.json"', "cache-control": "no-store" },
  });
}
