import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/job-card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeMatch, SCORE_DISCLAIMER } from "@/lib/matching";
import { getMatchConfig, jobRowToMatchJob, loadMatchWorker, JOB_MATCH_SELECT } from "@/lib/match-data";
import { logError } from "@/lib/logger";

export const metadata = { title: "Empleos recomendados" };

export default async function RecommendedPage() {
  const user = await requireRole("worker", "/trabajador/recomendados");
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [worker, cfg, { data: jobs }] = await Promise.all([
    loadMatchWorker(supabase, user.id), getMatchConfig(supabase),
    supabase.from("job_offers").select(JOB_MATCH_SELECT).eq("status", "activa").or(`closes_at.is.null,closes_at.gte.${today}`).order("published_at", { ascending: false }).limit(100),
  ]);
  const ranked = worker ? (jobs ?? []).map((j: any) => ({ j, m: computeMatch(worker, jobRowToMatchJob(j), cfg.weights) })).sort((a, b) => b.m.score - a.m.score).slice(0, 24) : [];

  // Caché auditable de las recomendaciones vigentes (best effort)
  if (ranked.length) {
    const { error } = await supabase.from("recommendations").upsert(
      ranked.map(({ j, m }) => ({ worker_id: user.id, job_id: j.id, score: m.score, breakdown: { criteria: m.criteria, algorithm: m.algorithm, unmet: m.unmet }, config_version: cfg.version })),
      { onConflict: "worker_id,job_id" },
    );
    if (error) logError("recommendations.cache", error);
  }

  return (
    <>
      <PageHeader title="Empleos recomendados" description="Ordenados por compatibilidad con tu perfil. Te explicamos por qué y qué te falta." />
      <Alert variant="info" className="mb-5"><Sparkles className="mr-1 inline size-4" /> {SCORE_DISCLAIMER} Algoritmo determinista y auditable ({cfg.version ? `configuración v${cfg.version}` : ""}).</Alert>
      {!worker || (worker.skills.length === 0 && worker.years_experience === 0) ? (
        <Alert variant="warning" title="Completa tu perfil">Agrega tus habilidades y experiencia para obtener recomendaciones más precisas. <Link href="/trabajador/perfil" className="font-medium text-primary underline">Ir a mi perfil</Link></Alert>
      ) : null}
      {ranked.length === 0 ? (
        <div className="mt-4"><EmptyState icon={Sparkles} title="Todavía no hay ofertas para recomendarte" action={<Button asChild variant="secondary"><Link href="/empleos">Explorar empleos</Link></Button>}>Cuando se publiquen ofertas activas aparecerán aquí.</EmptyState></div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {ranked.map(({ j, m }) => (
            <JobCard key={j.id} job={j} score={m.score} footer={
              <div className="space-y-1.5 text-sm">
                <p className="font-medium">{m.summary}</p>
                {m.reasons.slice(0, 3).map((r) => <p key={r} className="text-muted-foreground">✓ {r}</p>)}
                {m.unmet.slice(0, 3).map((u) => <p key={u} className="text-[hsl(30_70%_30%)]">• {u}</p>)}
              </div>
            } />
          ))}
        </div>
      )}
    </>
  );
}
