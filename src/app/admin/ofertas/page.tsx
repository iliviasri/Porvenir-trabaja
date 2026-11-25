import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Alert, Badge, StatusBadge } from "@/components/ui/feedback";
import { ModerationControls } from "@/components/forms/admin-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkOfferContent } from "@/lib/offer-safety";
import { formatDate, formatSalary } from "@/lib/utils";
import { label } from "@/lib/constants";

export const metadata = { title: "Moderación de ofertas" };
export const dynamic = "force-dynamic";

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireRole("admin", "/admin/ofertas");
  const sp = await searchParams;
  const estado = sp.estado || "pendiente_moderacion";
  const supabase = await createClient();
  let q = supabase.from("job_offers").select("*, businesses(trade_name, status)").order("created_at", { ascending: false }).limit(100);
  if (estado !== "todas") q = q.eq("status", estado);
  const { data: jobs } = await q;
  const tabs = ["pendiente_moderacion", "activa", "suspendida", "rechazada", "todas"];
  return (
    <>
      <PageHeader title="Moderación de ofertas" description="Revisa que las ofertas sean claras, legales y exclusivas de El Porvenir." />
      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">{tabs.map((t) => <a key={t} href={`?estado=${t}`} aria-current={t === estado ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${t === estado ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t === "todas" ? "Todas" : label(t)}</a>)}</nav>
      {(jobs ?? []).length === 0 && <p className="text-muted-foreground">No hay ofertas en este estado.</p>}
      <ul className="space-y-3">{(jobs ?? []).map((j: any) => {
        const safety = checkOfferContent({ title: j.title, description: j.description, offer_type: j.offer_type, schedule_text: j.schedule_text ?? "" });
        return (
          <li key={j.id}><Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-semibold">{j.title} {j.is_demo && <Badge variant="outline">demo</Badge>}</h2>
              <p className="text-sm text-muted-foreground">{j.businesses?.trade_name} · {label(j.offer_type)} · {formatSalary(j.salary_min, j.salary_max)} · {formatDate(j.created_at)}</p></div><StatusBadge status={j.status} /></div>
            <p className="whitespace-pre-line text-sm">{j.description}</p>
            {safety.blocked.map((m: string) => <Alert key={m} variant="error">Bloqueante: {m}</Alert>)}
            {safety.warnings.map((m: string) => <Alert key={m} variant="warning">Advertencia: {m}</Alert>)}
            <ModerationControls jobId={j.id} status={j.status} />
          </Card></li>);
      })}</ul>
    </>
  );
}
