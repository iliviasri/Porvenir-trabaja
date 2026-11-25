import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState, StatusBadge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/forms/shared";
import { closeJob, deleteJob } from "@/actions/jobs";
import { requireBusinessPage } from "@/lib/business-page";
import { formatDate, formatSalary } from "@/lib/utils";
import { label } from "@/lib/constants";

export const metadata = { title: "Mis ofertas laborales" };

export default async function JobsManagePage() {
  const { supabase, business } = await requireBusinessPage("/empresa/ofertas");
  const { data: jobs } = await supabase.from("job_offers").select("*, applications(id)").eq("business_id", business.id).order("created_at", { ascending: false });
  return (
    <>
      <PageHeader title="Mis ofertas laborales" description="Toda oferta pasa por una moderación antes de publicarse." actions={<Button asChild><Link href="/empresa/ofertas/nueva"><Plus /> Nueva oferta</Link></Button>} />
      {business.status === "suspendido" && <Alert variant="error" className="mb-4">Tu negocio está suspendido: no puedes publicar ofertas.</Alert>}
      {!jobs || jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aún no creaste ofertas" action={<Button asChild size="lg"><Link href="/empresa/ofertas/nueva">Crear mi primera oferta</Link></Button>}>Publica un puesto con sus requisitos para recibir postulaciones de El Porvenir.</EmptyState>
      ) : (
        <ul className="space-y-3">{jobs.map((j: any) => (
          <li key={j.id}><Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="text-lg font-semibold">{j.title}</h2><p className="text-sm text-muted-foreground">{label(j.offer_type)} · {formatSalary(j.salary_min, j.salary_max)} · {j.vacancies} vacante(s) · creada {formatDate(j.created_at)}</p></div>
              <StatusBadge status={j.status} />
            </div>
            {j.moderation_notes && <Alert variant={j.status === "activa" ? "info" : "warning"} title="Observación de moderación">{j.moderation_notes}</Alert>}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{j.applications?.length ?? 0} postulación(es)</span>
              {j.status !== "suspendida" && <Button asChild size="sm" variant="outline"><Link href={`/empresa/ofertas/${j.id}`}>Editar</Link></Button>}
              {(j.applications?.length ?? 0) > 0 && <Button asChild size="sm" variant="secondary"><Link href={`/empresa/candidatos?oferta=${j.id}`}>Ver candidatos</Link></Button>}
              {j.status === "activa" && <Button asChild size="sm" variant="ghost"><Link href={`/empleos/${j.id}`}>Ver publicación</Link></Button>}
              {(j.status === "activa" || j.status === "pendiente_moderacion") && <ActionButton action={() => closeJob(j.id)} confirm="¿Cerrar esta convocatoria?" variant="ghost">Cerrar convocatoria</ActionButton>}
              {(j.status === "borrador" || j.status === "rechazada") && <ActionButton action={() => deleteJob(j.id)} confirm="¿Eliminar esta oferta?" variant="ghost">Eliminar</ActionButton>}
            </div>
          </Card></li>))}</ul>)}
    </>
  );
}
