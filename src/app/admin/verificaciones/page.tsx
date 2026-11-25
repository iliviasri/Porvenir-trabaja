import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState, StatusBadge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { DocReviewControls } from "@/components/forms/admin-forms";
import { VerificationDisclaimer } from "@/components/shared/verification";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Verificaciones" };
export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  await requireRole("admin", "/admin/verificaciones");
  const supabase = await createClient();
  const { data: docs } = await supabase.from("business_documents").select("*, businesses(trade_name)").in("status", ["presentado", "observado"]).order("created_at");
  return (
    <>
      <PageHeader title="Verificación de documentos" description="Cola de documentos presentados por los negocios." />
      <Alert variant="warning" className="mb-4"><VerificationDisclaimer /> Aprobar un documento aquí es una revisión interna; no equivale a autorización de la SUNAT ni de la municipalidad.</Alert>
      {!docs || docs.length === 0 ? <EmptyState title="No hay documentos pendientes" /> : (
        <ul className="space-y-3">{docs.map((d: any) => (
          <li key={d.id}><Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{d.doc_label}</p><p className="text-sm text-muted-foreground">{d.businesses?.trade_name} · {d.original_name} · {formatDateTime(d.created_at)}</p></div><StatusBadge status={d.status} /></div>
            {d.review_notes && <p className="text-sm">Observación previa: {d.review_notes}</p>}
            <div className="flex flex-wrap items-start gap-3"><Button asChild variant="outline" size="sm"><a href={`/api/files/doc/${d.id}`} target="_blank" rel="noopener noreferrer"><Download /> Abrir archivo</a></Button></div>
            <DocReviewControls docId={d.id} />
          </Card></li>))}</ul>)}
    </>
  );
}
