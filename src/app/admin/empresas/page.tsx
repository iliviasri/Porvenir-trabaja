import Link from "next/link";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/feedback";
import { BusinessStatusControls } from "@/components/forms/admin-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { label } from "@/lib/constants";

export const metadata = { title: "Negocios" };
export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage() {
  await requireRole("admin", "/admin/empresas");
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*, job_categories(name)").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="Negocios" description="Todos los negocios registrados. El RUC solo se marca como verificado citando una fuente." />
      <ul className="space-y-3">{(data ?? []).map((b: any) => (
        <li key={b.id}><Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="text-lg font-semibold">{b.trade_name} {b.is_demo && <Badge variant="outline">demo</Badge>}</h2>
              <p className="text-sm text-muted-foreground">{b.job_categories?.name ?? "Sin sector"} · {label(b.premises)} · {b.workers_count} trabajador(es) · alta {formatDate(b.created_at)}</p>
              <p className="text-sm">RUC: {b.ruc ?? "—"} {b.ruc && (b.ruc_verified ? <Badge variant="success">verificado: {b.ruc_verified_source}</Badge> : <Badge variant="secondary">declarado, no verificado</Badge>)}</p></div>
            <StatusBadge status={b.status} />
          </div>
          <BusinessStatusControls businessId={b.id} status={b.status} hasRuc={!!b.ruc} rucVerified={b.ruc_verified} />
          <Link href={`/empresas/${b.id}`} className="text-sm text-primary underline">Ver ficha pública</Link>
        </Card></li>))}</ul>
    </>
  );
}
