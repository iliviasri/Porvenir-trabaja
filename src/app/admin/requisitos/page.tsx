import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { KnowledgeForm, RequirementForm, ToggleRequirementButton } from "@/components/forms/admin-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { label } from "@/lib/constants";

export const metadata = { title: "Requisitos y conocimiento" };
export const dynamic = "force-dynamic";

export default async function AdminRequirementsPage() {
  await requireRole("admin", "/admin/requisitos");
  const supabase = await createClient();
  const [{ data: reqs }, { data: kb }] = await Promise.all([
    supabase.from("formalization_requirements").select("*").order("sort_order").order("version", { ascending: false }),
    supabase.from("knowledge_sources").select("*").order("created_at", { ascending: false }),
  ]);
  const latest = new Map<string, any>();
  (reqs ?? []).forEach((r: any) => { if (!latest.has(r.code)) latest.set(r.code, r); });
  const emptyReq = { code: "", category: "otra", title: "", summary: "", plain_explanation: "", documents: "", applies_when: "", caveats: "", source_label: "", source_url: "", sort_order: 100, active: true };
  return (
    <>
      <PageHeader title="Catálogo de requisitos y conocimiento" description="Editar un requisito crea una nueva versión; las anteriores se conservan." />
      <h2 className="mb-3 text-xl">Requisitos de formalización</h2>
      <ul className="space-y-3">{[...latest.values()].map((r: any) => (
        <li key={r.id}><Card><details><summary className="flex cursor-pointer flex-wrap items-center gap-2 p-4"><strong>{r.title}</strong><Badge variant="outline">{label(r.category)}</Badge><Badge variant="secondary">v{r.version}</Badge>{!r.active && <Badge variant="destructive">inactivo</Badge>}<span className="text-sm text-muted-foreground">revisado {formatDate(r.last_reviewed_at)}</span></summary>
          <CardContent className="space-y-3 border-t pt-4"><RequirementForm defaults={{ id: r.id, code: r.code, category: r.category, title: r.title, summary: r.summary, plain_explanation: r.plain_explanation, documents: (r.documents ?? []).join("\n"), applies_when: Object.keys(r.applies_when ?? {}).length ? JSON.stringify(r.applies_when, null, 2) : "", caveats: r.caveats ?? "", source_label: r.source_label, source_url: r.source_url ?? "", sort_order: r.sort_order, active: r.active }} /><ToggleRequirementButton id={r.id} active={r.active} /></CardContent></details></Card></li>))}</ul>
      <Card className="mt-4"><CardHeader><CardTitle>Nuevo requisito</CardTitle></CardHeader><CardContent><RequirementForm defaults={emptyReq} /></CardContent></Card>

      <h2 className="mb-3 mt-10 text-xl">Base de conocimiento del chatbot</h2>
      <ul className="space-y-3">{(kb ?? []).map((k: any) => (
        <li key={k.id}><Card><details><summary className="flex cursor-pointer flex-wrap items-center gap-2 p-4"><strong>{k.title}</strong><Badge variant="outline">{k.category}</Badge>{k.is_official && <Badge variant="success">oficial</Badge>}{!k.active && <Badge variant="destructive">inactiva</Badge>}<span className="text-sm text-muted-foreground">actualizada {formatDate(k.last_updated)}</span></summary>
          <CardContent className="border-t pt-4"><KnowledgeForm defaults={{ id: k.id, title: k.title, content: k.content, category: k.category, url: k.url ?? "", is_official: k.is_official, active: k.active }} /></CardContent></details></Card></li>))}</ul>
      <Card className="mt-4"><CardHeader><CardTitle>Nueva fuente de conocimiento</CardTitle></CardHeader><CardContent><KnowledgeForm defaults={{ title: "", content: "", category: "plataforma", url: "", is_official: false, active: true }} /></CardContent></Card>
    </>
  );
}
