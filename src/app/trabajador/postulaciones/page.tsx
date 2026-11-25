import Link from "next/link";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { EmptyState, StatusBadge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/forms/shared";
import { withdrawApplication } from "@/actions/worker";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { label } from "@/lib/constants";

export const metadata = { title: "Mis postulaciones" };

export default async function ApplicationsPage() {
  const user = await requireRole("worker", "/trabajador/postulaciones");
  const supabase = await createClient();
  const { data: apps } = await supabase.from("applications")
    .select("id, status, match_score, cover_note, created_at, job_offers(id, title, status, businesses(trade_name)), application_status_history(new_status, created_at)")
    .eq("worker_id", user.id).order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Mis postulaciones" description="Sigue el estado de cada postulación. La empresa te avisará cuando cambie." />
      {!apps || apps.length === 0 ? (
        <EmptyState icon={Send} title="Aún no has postulado a ningún empleo" action={<Button asChild><Link href="/empleos">Buscar empleo</Link></Button>}>Cuando postules, aquí verás el avance de tu proceso.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {apps.map((a: any) => {
            const hist = [...(a.application_status_history ?? [])].sort((x: any, y: any) => +new Date(x.created_at) - +new Date(y.created_at));
            return (
              <li key={a.id}><Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold"><Link href={`/empleos/${a.job_offers?.id}`} className="hover:text-primary hover:underline">{a.job_offers?.title}</Link></h2>
                    <p className="text-muted-foreground">{a.job_offers?.businesses?.trade_name}</p>
                    {a.job_offers?.status !== "activa" && <p className="text-sm text-muted-foreground">Convocatoria: {label(a.job_offers?.status)}</p>}
                  </div>
                  <div className="flex items-center gap-2"><StatusBadge status={a.status} />{a.match_score != null && <span className="text-sm text-muted-foreground">Compat. {a.match_score} %</span>}</div>
                </div>
                <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                  {hist.map((h: any, i: number) => <li key={i}>{label(h.new_status)} · {formatDateTime(h.created_at)}</li>)}
                </ol>
                {a.status === "enviada" && <div className="mt-3"><ActionButton action={() => withdrawApplication(a.id)} confirm="¿Retirar esta postulación?" variant="ghost">Retirar postulación</ActionButton></div>}
              </Card></li>
            );
          })}
        </ul>
      )}
    </>
  );
}
