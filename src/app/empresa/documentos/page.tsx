import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState, StatusBadge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/forms/shared";
import { DocumentUpload } from "@/components/forms/business-forms";
import { VerificationDisclaimer } from "@/components/shared/verification";
import { deleteDocument } from "@/actions/business";
import { requireBusinessPage } from "@/lib/business-page";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Documentación" };

export default async function DocumentsPage() {
  const { supabase, business } = await requireBusinessPage("/empresa/documentos");
  const [{ data: docs }, { data: tasks }] = await Promise.all([
    supabase.from("business_documents").select("*").eq("business_id", business.id).order("created_at", { ascending: false }),
    supabase.from("formalization_tasks").select("status, formalization_requirements(id, title, documents)").eq("business_id", business.id).neq("status", "no_aplica"),
  ]);
  const reqs = (tasks ?? []).map((t: any) => ({ id: t.formalization_requirements.id, title: t.formalization_requirements.title, documents: t.formalization_requirements.documents as string[], done: t.status === "completado" }));
  const pending = reqs.filter((r) => !r.done);
  return (
    <>
      <PageHeader title="Documentación" description="Presenta documentos para que la administración los revise. La revisión es interna de la plataforma." />
      <div className="mb-5"><VerificationDisclaimer className="text-sm text-muted-foreground" /></div>
      {pending.length > 0 && (
        <Alert variant="info" title="Documentos que normalmente necesitarás" className="mb-5">
          <ul className="ml-5 mt-1 list-disc">{pending.map((r) => <li key={r.id}><strong>{r.title}:</strong> {r.documents.join("; ")}</li>)}</ul>
        </Alert>
      )}
      <DocumentUpload requirements={reqs.map(({ id, title }) => ({ id, title }))} />
      <h2 className="mb-3 mt-8 text-xl">Documentos presentados</h2>
      {!docs || docs.length === 0 ? <EmptyState icon={FileText} title="Aún no presentaste documentos" /> : (
        <ul className="space-y-3">{docs.map((d: any) => (
          <li key={d.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0"><p className="font-semibold">{d.doc_label}</p><p className="truncate text-sm text-muted-foreground">{d.original_name} · {formatDateTime(d.created_at)}</p>{d.review_notes && <p className="mt-1 text-sm">Observación: {d.review_notes}</p>}</div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={d.status} />
              <Button asChild variant="outline" size="sm"><a href={`/api/files/doc/${d.id}`} target="_blank" rel="noopener noreferrer"><Download /> Ver</a></Button>
              {d.status !== "aprobado" && <ActionButton action={() => deleteDocument(d.id)} confirm="¿Eliminar este documento?" variant="ghost">Eliminar</ActionButton>}</div>
          </Card></li>))}</ul>)}
    </>
  );
}
