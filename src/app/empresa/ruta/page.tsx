import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, EmptyState, Progress, StatusBadge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { TaskControls } from "@/components/forms/business-forms";
import { VerificationDisclaimer } from "@/components/shared/verification";
import { requireBusinessPage } from "@/lib/business-page";
import { computeProgress } from "@/lib/formalization";
import { formatDate, formatDateTime } from "@/lib/utils";
import { label } from "@/lib/constants";

export const metadata = { title: "Ruta y seguimiento" };

export default async function RoutePage() {
  const { supabase, business } = await requireBusinessPage("/empresa/ruta");
  const [{ data: tasks }, { data: diag }, { data: verifs }] = await Promise.all([
    supabase.from("formalization_tasks").select("*, formalization_requirements(*), formalization_task_history(old_status, new_status, note, created_at)").eq("business_id", business.id),
    supabase.from("formalization_diagnostics").select("ai_summary, ai_generated, created_at").eq("business_id", business.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("business_verifications").select("from_status, to_status, notes, created_at").eq("business_id", business.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const sorted = [...(tasks ?? [])].sort((a: any, b: any) => a.formalization_requirements.sort_order - b.formalization_requirements.sort_order);
  const progress = computeProgress(sorted as any);
  const active = sorted.filter((t: any) => t.status !== "no_aplica");
  const inactive = sorted.filter((t: any) => t.status === "no_aplica");

  if (!tasks || tasks.length === 0) {
    return (<><PageHeader title="Ruta y seguimiento" /><EmptyState icon={FileText} title="Todavía no tienes una ruta" action={<Button asChild size="lg"><Link href="/empresa/diagnostico">Hacer mi diagnóstico</Link></Button>}>Responde el diagnóstico y generamos los trámites que te corresponden.</EmptyState></>);
  }
  return (
    <>
      <PageHeader title="Ruta y seguimiento" description="Tus trámites de formalización, con documentos, fuentes oficiales y avance." actions={<StatusBadge status={business.status} />} />
      <Card className="mb-4"><CardContent className="space-y-3 pt-5">
        <div className="flex items-end justify-between"><p className="text-3xl font-bold">{progress.percent} %</p><p className="text-sm text-muted-foreground">{progress.done} completados · {progress.inProgress} en proceso · {progress.pending} pendientes</p></div>
        <Progress value={progress.percent} label="Avance orientativo" />
        <p className="text-xs text-muted-foreground">Porcentaje orientativo calculado sobre los requisitos aplicables a tu caso. No representa un estado oficial.</p></CardContent></Card>
      {business.admin_notes && <Alert variant="warning" title="Observación de la administración" className="mb-4">{business.admin_notes}</Alert>}
      {diag?.ai_summary && (
        <Card className="mb-4"><CardHeader><CardTitle className="flex flex-wrap items-center gap-2">Tu ruta en palabras sencillas <Badge variant={diag.ai_generated ? "default" : "secondary"}>{diag.ai_generated ? "Redactado con IA" : "Texto automático (sin IA)"}</Badge></CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-line">{diag.ai_summary}</p><p className="mt-2 text-xs text-muted-foreground">Diagnóstico del {formatDateTime(diag.created_at)}. Las obligaciones salen del catálogo oficial versionado, no de la IA.</p></CardContent></Card>
      )}

      <ol className="space-y-4">
        {active.map((t: any, i: number) => {
          const r = t.formalization_requirements;
          const hist = [...(t.formalization_task_history ?? [])].sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at));
          return (
            <li key={t.id}><Card><CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2"><CardTitle><span className="mr-2 text-muted-foreground">{i + 1}.</span>{r.title}</CardTitle><div className="flex gap-2"><Badge variant="outline">{label(r.category)}</Badge><StatusBadge status={t.status} /></div></div></CardHeader>
              <CardContent className="space-y-4">
                <p>{r.plain_explanation}</p>
                {Array.isArray(r.documents) && r.documents.length > 0 && <div><p className="font-semibold">Documentos y condiciones:</p><ul className="ml-5 list-disc">{r.documents.map((d: string) => <li key={d}>{d}</li>)}</ul></div>}
                {r.caveats && <Alert variant="warning">{r.caveats}</Alert>}
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">Fuente: {r.source_url ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">{r.source_label} <ExternalLink className="size-3" /></a> : r.source_label} · Revisado {formatDate(r.last_reviewed_at)} · Catálogo v{r.version}</p>
                <TaskControls taskId={t.id} status={t.status} note={t.note} dueDate={t.due_date} />
                {hist.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-medium">Historial de cambios</summary><ul className="mt-2 space-y-1 text-muted-foreground">{hist.map((h: any, k: number) => <li key={k}>{formatDateTime(h.created_at)} · {h.old_status ? `${label(h.old_status)} → ` : ""}{label(h.new_status)}{h.note ? ` — ${h.note}` : ""}</li>)}</ul></details>}
              </CardContent></Card></li>
          );
        })}
      </ol>
      {inactive.length > 0 && <details className="mt-6 rounded-lg border bg-card p-4"><summary className="cursor-pointer font-medium">Trámites que no aplican a tu caso ({inactive.length})</summary><ul className="mt-2 ml-5 list-disc text-muted-foreground">{inactive.map((t: any) => <li key={t.id}>{t.formalization_requirements.title}</li>)}</ul></details>}
      {verifs && verifs.length > 0 && <section className="mt-6"><h2 className="mb-2 text-xl">Historial de revisión del negocio</h2><ul className="space-y-1 text-sm">{verifs.map((v: any, i: number) => <li key={i} className="rounded border bg-card p-3">{formatDateTime(v.created_at)} · {v.from_status ? `${label(v.from_status)} → ` : ""}<strong>{label(v.to_status)}</strong>{v.notes ? ` — ${v.notes}` : ""}</li>)}</ul></section>}
      <div className="mt-6"><VerificationDisclaimer /></div>
    </>
  );
}
