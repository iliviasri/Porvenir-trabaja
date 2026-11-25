import Link from "next/link";
import { UserSearch } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form-controls";
import { requireBusinessPage } from "@/lib/business-page";
import { candidateRowToMatchWorker, getMatchConfig, jobRowToMatchJob, JOB_MATCH_SELECT } from "@/lib/match-data";
import { computeMatch, SCORE_DISCLAIMER } from "@/lib/matching";
import { label } from "@/lib/constants";

export const metadata = { title: "Recomendaciones de candidatos" };

export default async function RecommendedCandidatesPage({ searchParams }: { searchParams: Promise<{ oferta?: string }> }) {
  const sp = await searchParams;
  const { supabase, business } = await requireBusinessPage("/empresa/recomendaciones");
  const { data: jobs } = await supabase.from("job_offers").select(JOB_MATCH_SELECT).eq("business_id", business.id).eq("status", "activa").order("created_at", { ascending: false });
  const job = (jobs ?? []).find((j: any) => j.id === sp.oferta) ?? (jobs ?? [])[0];
  const cfg = await getMatchConfig(supabase);
  // candidate_cards: vista sin contacto, solo perfiles que autorizaron ser visibles
  const { data: cards } = job ? await supabase.from("candidate_cards").select("*").limit(300) : { data: [] as any[] };
  const matchJob = job ? jobRowToMatchJob(job) : null;
  const ranked = matchJob ? (cards ?? []).map((c: any) => ({ c, m: computeMatch(candidateRowToMatchWorker(c), matchJob, cfg.weights) })).sort((a, b) => b.m.score - a.m.score).slice(0, 20) : [];

  return (
    <>
      <PageHeader title="Recomendaciones de candidatos" description="Perfiles que autorizaron ser visibles, ordenados por compatibilidad con tu oferta." />
      {!job ? (
        <EmptyState icon={UserSearch} title="Necesitas una oferta activa" action={<Button asChild><Link href="/empresa/ofertas">Ir a mis ofertas</Link></Button>}>Las recomendaciones se calculan contra una oferta publicada.</EmptyState>
      ) : (
        <>
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
            <div className="min-w-[260px]"><label htmlFor="oferta" className="mb-1.5 block text-sm font-medium">Oferta</label><Select id="oferta" name="oferta" defaultValue={job.id}>{(jobs ?? []).map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select></div>
            <Button type="submit" variant="secondary">Calcular</Button>
          </form>
          <Alert variant="info" className="mb-4">{SCORE_DISCLAIMER} Por privacidad no mostramos teléfono ni correo: el candidato debe postular a tu oferta para compartir su contacto.</Alert>
          {ranked.length === 0 ? <EmptyState icon={UserSearch} title="Aún no hay candidatos visibles">Cuando los trabajadores activen la visibilidad de su perfil, aparecerán aquí.</EmptyState> : (
            <ul className="space-y-3">{ranked.map(({ c, m }, i) => (
              <li key={c.user_id}><Card className="space-y-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h2 className="text-lg font-semibold">{c.display_name || "Candidato"} <span className="text-sm font-normal text-muted-foreground">#{i + 1}</span></h2><p className="text-muted-foreground">{c.headline || "Sin título"} · {Number(c.years_experience)} año(s) · Disponibilidad: {label(c.availability).toLowerCase()}</p></div>
                  <Badge variant={m.score >= 70 ? "success" : m.score >= 40 ? "warning" : "secondary"}>Compatibilidad {m.score} %</Badge>
                </div>
                <p className="text-sm">{m.summary}</p>
                {c.skills?.length > 0 && <div className="flex flex-wrap gap-1.5">{c.skills.map((s: string) => <Badge key={s} variant={m.matched_skills.includes(s) ? "success" : "outline"}>{s}</Badge>)}</div>}
                {m.unmet.length > 0 && <ul className="ml-5 list-disc text-sm text-muted-foreground">{m.unmet.slice(0, 3).map((u) => <li key={u}>{u}</li>)}</ul>}
              </Card></li>))}</ul>)}
        </>
      )}
    </>
  );
}
