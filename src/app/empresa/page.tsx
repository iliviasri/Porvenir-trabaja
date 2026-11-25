import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Progress, StatusBadge } from "@/components/ui/feedback";
import { VerificationDisclaimer } from "@/components/shared/verification";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness } from "@/lib/business";
import { computeProgress } from "@/lib/formalization";

export default async function BusinessHome() {
  const user = await requireRole("business", "/empresa");
  const supabase = await createClient();
  const business = await getMyBusiness(supabase, user.id);

  if (!business) {
    return (
      <>
        <PageHeader title="Bienvenido/a" description="Empieza registrando tu negocio. Puede ser formal o informal: te ayudamos a ordenar el camino." />
        <EmptyState icon={Store} title="Aún no registras tu negocio" action={<Button asChild size="lg"><Link href="/empresa/negocio">Registrar mi negocio</Link></Button>}>Con tu negocio registrado podrás hacer el diagnóstico de formalización, publicar ofertas y aparecer en el directorio.</EmptyState>
      </>
    );
  }
  const [{ data: tasks }, { data: jobs }, apps, { data: docs }] = await Promise.all([
    supabase.from("formalization_tasks").select("id, status, formalization_requirements(title)").eq("business_id", business.id),
    supabase.from("job_offers").select("id, status").eq("business_id", business.id),
    supabase.from("applications").select("id, job_offers!inner(business_id)", { count: "exact", head: true }).eq("job_offers.business_id", business.id).eq("status", "enviada"),
    supabase.from("business_documents").select("status").eq("business_id", business.id),
  ]);
  const progress = computeProgress((tasks ?? []) as any);
  const pending = (tasks ?? []).filter((t: any) => t.status === "pendiente" || t.status === "en_proceso").slice(0, 4);
  const activeJobs = (jobs ?? []).filter((j: any) => j.status === "activa").length;

  return (
    <>
      <PageHeader title={business.trade_name} description="Resumen de tu negocio" actions={<StatusBadge status={business.status} />} />
      {business.admin_notes && <Alert variant="warning" title="Observación de la administración" className="mb-4">{business.admin_notes}</Alert>}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2"><CardHeader><CardTitle>Avance de formalización (orientativo)</CardTitle></CardHeader><CardContent className="space-y-3">
          {progress.total === 0 ? <p className="text-muted-foreground">Aún no hiciste tu diagnóstico.</p> : <><p className="text-3xl font-bold">{progress.percent} %</p><Progress value={progress.percent} /><p className="text-sm text-muted-foreground">{progress.done} de {progress.total} trámites aplicables completados</p></>}
          <Button asChild variant="link" className="px-0"><Link href={progress.total ? "/empresa/ruta" : "/empresa/diagnostico"}>{progress.total ? "Ver mi ruta" : "Hacer mi diagnóstico"} <ArrowRight /></Link></Button></CardContent></Card>
        <Card><CardHeader><CardTitle>Ofertas activas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{activeJobs}</p><Button asChild variant="link" className="px-0"><Link href="/empresa/ofertas">Gestionar <ArrowRight /></Link></Button></CardContent></Card>
        <Card><CardHeader><CardTitle>Postulaciones nuevas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{apps.count ?? 0}</p><Button asChild variant="link" className="px-0"><Link href="/empresa/candidatos">Revisar <ArrowRight /></Link></Button></CardContent></Card>
      </div>
      {pending.length > 0 && (
        <Card className="mt-4"><CardHeader><CardTitle>Trámites pendientes</CardTitle></CardHeader><CardContent><ul className="space-y-2">{pending.map((t: any) => (<li key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-3"><span>{t.formalization_requirements?.title}</span><StatusBadge status={t.status} /></li>))}</ul></CardContent></Card>
      )}
      <Card className="mt-4"><CardContent className="space-y-1 pt-5"><p><strong>Documentos presentados:</strong> {(docs ?? []).length} ({(docs ?? []).filter((d: any) => d.status === "aprobado").length} aprobados)</p><VerificationDisclaimer /></CardContent></Card>
    </>
  );
}
