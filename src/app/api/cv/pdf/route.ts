import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/auth";
import { buildCvPdf } from "@/lib/cv-pdf";
import { label } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  const auth = await authorize("worker");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const supabase = await createClient();
  const [{ data: wp }, { data: skills }, { data: exps }] = await Promise.all([
    supabase.from("worker_profiles").select("headline, bio, availability").eq("user_id", auth.user.id).maybeSingle(),
    supabase.from("worker_skills").select("skills(name)").eq("worker_id", auth.user.id),
    supabase.from("worker_experiences").select("role_title, company, months, description").eq("worker_id", auth.user.id).order("created_at"),
  ]);
  if (!wp) return NextResponse.json({ error: "Completa tu perfil primero." }, { status: 404 });
  const bytes = await buildCvPdf({
    name: auth.user.fullName, phone: auth.user.phone, email: auth.user.email, headline: wp.headline ?? "", summary: wp.bio ?? "",
    skills: (skills ?? []).map((s: any) => s.skills?.name).filter(Boolean),
    experiences: (exps ?? []).map((e: any) => ({ role_title: e.role_title, company: e.company ?? "", months: e.months, description: e.description ?? "" })),
    availability: `Disponibilidad: ${label(wp.availability)}`,
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="mi-cv-porvenir-trabaja.pdf"', "cache-control": "private, no-store" },
  });
}
