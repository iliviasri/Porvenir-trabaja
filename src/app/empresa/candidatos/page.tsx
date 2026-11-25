import Link from "next/link";
import { Download, Phone, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { ApplicationStatusSelect } from "@/components/forms/job-actions";
import { requireBusinessPage } from "@/lib/business-page";
import { formatDateTime } from "@/lib/utils";
import { SCORE_DISCLAIMER } from "@/lib/matching";

export const metadata = { title: "Candidatos" };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ oferta?: string; estado?: string }> }) {
  const sp = await searchParams;
  const { supabase, business } = await requireBusinessPage("/empresa/candidatos");
  const { data: jobs } = await supabase.from("job_offers").select("id, title, status").eq("business_id", business.id).order("created_at", { ascending: false });
  let q = supabase.from("applications")
    .select("id, status, cover_note, match_score, match_detail, created_at, worker_id, job_offers!inner(id, title, business_id), worker_profiles(headline, bio, years_experience, availability, cv_path, profiles(full_name, phone), worker_skills(skills(name)))")
    .eq("job_offers.business_id", business.id).order("created_at", { ascending: false }).limit(100);
  if (sp.oferta && /^[0-9a-f-]{36}$/i.test(sp.oferta)) q = q.eq("job_id", sp.oferta);
  if (sp.estado) q = q.eq("status", sp.estado);
  const { data: apps } = await q;

  return (
    <>
      <PageHeader title="Candidatos" description="Personas que postularon a tus ofertas y autorizaron compartir su perfil contigo." />
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="min-w-[220px]"><label htmlFor="oferta" className="mb-1.5 block text-sm font-medium">Oferta</label>
          <Select id="oferta" name="oferta" defaultValue={sp.oferta ?? ""}><option value="">Todas</option>{(jobs ?? []).map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select></div>
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>
      <p className="mb-4 text-sm text-muted-foreground">{SCORE_DISCLAIMER}</p>
      {!apps || apps.length === 0 ? (
        <EmptyState icon={Users} title="Aún no hay postulaciones" action={<Button asChild variant="secondary"><Link href="/empresa/ofertas">Ver mis ofertas</Link></Button>}>Cuando alguien postule a tus ofertas activas, aparecerá aquí.</EmptyState>
      ) : (
        <ul className="space-y-3">{apps.map((a: any) => {
          const wp = a.worker_profiles, p = wp?.profiles;
          const skills = (wp?.worker_skills ?? []).map((s: any) => s.skills?.name).filter(Boolean);
          const detail = a.match_detail;
          return (
            <li key={a.id}><Card className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-lg font-semibold">{p?.full_name || "Postulante"}</h2><p className="text-muted-foreground">{wp?.headline || "Sin título"} · Postuló a <strong>{a.job_offers?.title}</strong></p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(a.created_at)} · {Number(wp?.years_experience ?? 0)} año(s) de experiencia</p></div>
                <div className="flex flex-col items-end gap-2">{a.match_score != null && <Badge variant={a.match_score >= 70 ? "success" : a.match_score >= 40 ? "warning" : "secondary"}>Compatibilidad {a.match_score} %</Badge>}<ApplicationStatusSelect applicationId={a.id} status={a.status} /></div>
              </div>
              {skills.length > 0 && <div className="flex flex-wrap gap-1.5">{skills.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}</div>}
              {a.cover_note && <p className="rounded-md bg-muted p-3 text-sm">«{a.cover_note}»</p>}
              {detail?.summary && <details className="text-sm"><summary className="cursor-pointer font-medium">¿Por qué esta compatibilidad?</summary>
                <p className="mt-1">{detail.summary}</p>
                {detail.unmet?.length > 0 && <ul className="mt-1 ml-5 list-disc text-muted-foreground">{detail.unmet.map((u: string) => <li key={u}>{u}</li>)}</ul>}</details>}
              <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
                {p?.phone && <a href={`tel:+51${p.phone}`} className="inline-flex items-center gap-1.5 text-primary underline"><Phone className="size-4" /> {p.phone}</a>}
                {wp?.cv_path && <Button asChild size="sm" variant="outline"><a href={`/api/files/cv/${a.worker_id}`} target="_blank" rel="noopener noreferrer"><Download /> Ver CV (PDF)</a></Button>}
              </div>
            </Card></li>
          );
        })}</ul>
      )}
    </>
  );
}
