import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/** Evita inyección de fórmulas en Excel y escapa CSV. */
function cell(v: unknown) {
  let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "sin_datos\n";
  const cols = Object.keys(rows[0]!);
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
};

export async function GET(req: Request) {
  const auth = await authorize("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const from = url.searchParams.get("from") || "1970-01-01";
  const to = (url.searchParams.get("to") || "2999-12-31") + "T23:59:59";
  const includeDemo = url.searchParams.get("demo") === "1";
  const admin = createAdminClient();

  let rows: Record<string, unknown>[] = [];
  if (type === "ofertas") {
    let q = admin.from("job_offers").select("id, title, offer_type, status, vacancies, salary_min, salary_max, modality, created_at, published_at, is_demo, businesses(trade_name), job_categories(name)").gte("created_at", from).lte("created_at", to).limit(10000);
    if (!includeDemo) q = q.eq("is_demo", false);
    const { data } = await q;
    rows = (data ?? []).map((j: any) => ({ id: j.id, cargo: j.title, negocio: j.businesses?.trade_name, sector: j.job_categories?.name, tipo: j.offer_type, estado: j.status, vacantes: j.vacancies, salario_min: j.salary_min, salario_max: j.salary_max, modalidad: j.modality, creada: j.created_at, publicada: j.published_at, demo: j.is_demo }));
  } else if (type === "postulaciones") {
    const { data } = await admin.from("applications").select("id, status, match_score, created_at, job_offers!inner(title, is_demo, businesses(trade_name))").gte("created_at", from).lte("created_at", to).limit(10000);
    rows = (data ?? []).filter((a: any) => includeDemo || !a.job_offers?.is_demo).map((a: any) => ({ id: a.id, oferta: a.job_offers?.title, negocio: a.job_offers?.businesses?.trade_name, estado: a.status, compatibilidad: a.match_score, fecha: a.created_at }));
  } else if (type === "negocios") {
    let q = admin.from("businesses").select("id, trade_name, ruc, ruc_declared, ruc_verified, status, workers_count, premises, is_public, created_at, is_demo, job_categories(name)").gte("created_at", from).lte("created_at", to).limit(10000);
    if (!includeDemo) q = q.eq("is_demo", false);
    const { data } = await q;
    rows = (data ?? []).map((b: any) => ({ id: b.id, negocio: b.trade_name, sector: b.job_categories?.name, ruc_declarado: b.ruc, estado_ruc_declarado: b.ruc_declared, ruc_verificado_interno: b.ruc_verified, estado: b.status, trabajadores: b.workers_count, local: b.premises, publico: b.is_public, registrado: b.created_at, demo: b.is_demo }));
  } else if (type === "trabajadores") {
    // Resumen ANONIMIZADO: sin nombres, teléfonos ni correos.
    let q = admin.from("worker_profiles").select("user_id, availability, years_experience, created_at, job_categories(name), profiles!inner(is_demo)").gte("created_at", from).lte("created_at", to).limit(10000);
    if (!includeDemo) q = q.eq("profiles.is_demo", false);
    const { data } = await q;
    rows = (data ?? []).map((w: any, i: number) => ({ n: i + 1, sector_principal: w.job_categories?.name, disponibilidad: w.availability, anios_experiencia: w.years_experience, registrado: w.created_at }));
  } else {
    return NextResponse.json({ error: "Tipo de reporte inválido." }, { status: 400 });
  }
  await audit(auth.user.id, "report.export", "report", type, { rows: rows.length, from, to, includeDemo });
  return new NextResponse(toCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="porvenir-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  });
}
