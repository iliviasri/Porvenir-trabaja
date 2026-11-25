import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StatsFilter { from?: string; to?: string; includeDemo: boolean }
export type Dist = { key: string; count: number }[];

function validDate(s?: string) { return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined; }
export function parseFilter(sp: { desde?: string; hasta?: string; demo?: string }): StatsFilter {
  return { from: validDate(sp.desde), to: validDate(sp.hasta), includeDemo: sp.demo !== "0" };
}

/** Estadísticas reales calculadas desde la base de datos (registros internos de la plataforma). */
export async function loadStats(f: StatsFilter) {
  const db = createAdminClient();
  const range = <T extends { gte: any; lte: any }>(q: T, col = "created_at") => {
    let r: any = q;
    if (f.from) r = r.gte(col, `${f.from}T00:00:00-05:00`);
    if (f.to) r = r.lte(col, `${f.to}T23:59:59-05:00`);
    return r;
  };
  const demo = (q: any) => (f.includeDemo ? q : q.eq("is_demo", false));
  const count = async (q: any) => {
    const { count, error } = await q;
    if (error) throw new Error(error.message || JSON.stringify(error));
    return count ?? 0;
  };
  const head = (t: string) => db.from(t).select("id", { count: "exact", head: true });

  const countWorkers = async () => {
    const { data: roleRows, error: roleErr } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "worker");
    if (roleErr) throw new Error(roleErr.message || JSON.stringify(roleErr));
    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return 0;
    return count(demo(range(head("profiles").in("id", ids))));
  };

  // Distribuciones: se traen solo las columnas necesarias (tamaño acotado por limit)
  const dist = async (table: string, col: string, hasDemo: boolean, extra?: (q: any) => any): Promise<Dist> => {
    let q: any = db.from(table).select(col).limit(20000);
    q = range(q);
    if (hasDemo) q = demo(q);
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message || JSON.stringify(error));
    const m = new Map<string, number>();
    for (const r of (data ?? []) as any[]) { const k = String(r[col] ?? "sin dato"); m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  };

  const [workers, businesses, jobsAll, jobsActive, apps, verifiedDocs, formalizedBiz] = await Promise.all([
    countWorkers(),
    count(demo(range(head("businesses")))),
    count(demo(range(head("job_offers")))),
    count(demo(range(head("job_offers").eq("status", "activa")))),
    count(range(head("applications"))),
    count(range(head("business_documents").eq("status", "aprobado"))),
    count(demo(range(head("businesses").eq("status", "documentacion_verificada")))),
  ]);
  const [businessStatus, jobStatus, appStatus, jobsByCategory, offerType] = await Promise.all([
    dist("businesses", "status", true), dist("job_offers", "status", true), dist("applications", "status", false),
    (async () => {
      let q: any = db.from("job_offers").select("job_categories(name)").limit(20000);
      q = demo(range(q));
      const { data } = await q; const m = new Map<string, number>();
      for (const r of (data ?? []) as any[]) { const k = r.job_categories?.name ?? "Sin sector"; m.set(k, (m.get(k) ?? 0) + 1); }
      return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
    })(),
    dist("job_offers", "offer_type", true),
  ]);
  return { workers, businesses, jobsAll, jobsActive, apps, verifiedDocs, formalizedBiz, businessStatus, jobStatus, appStatus, jobsByCategory, offerType };
}