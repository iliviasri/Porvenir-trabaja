import Link from "next/link";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/job-card";
import { SaveJobButton } from "@/components/forms/job-actions";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ofertas guardadas" };

export default async function SavedPage() {
  const user = await requireRole("worker", "/trabajador/guardadas");
  const supabase = await createClient();
  const { data } = await supabase.from("saved_jobs").select("created_at, job_offers(*, businesses(trade_name), job_categories(name))").eq("user_id", user.id).order("created_at", { ascending: false });
  const jobs = (data ?? []).map((r: any) => r.job_offers).filter(Boolean);
  return (
    <>
      <PageHeader title="Ofertas guardadas" description="Tus ofertas favoritas para revisarlas después." />
      {jobs.length === 0 ? (
        <EmptyState icon={Bookmark} title="No has guardado ofertas" action={<Button asChild><Link href="/empleos">Buscar empleo</Link></Button>}>Pulsa «Guardar oferta» en el detalle de un empleo.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{jobs.map((j: any) => <JobCard key={j.id} job={j} footer={<SaveJobButton jobId={j.id} saved />} />)}</div>
      )}
    </>
  );
}
