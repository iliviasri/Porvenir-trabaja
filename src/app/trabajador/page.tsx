import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/feedback";
import { CulCard } from "@/components/shared/cul-card";
import { JobCard } from "@/components/jobs/job-card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeMatch } from "@/lib/matching";
import { getMatchConfig, jobRowToMatchJob, loadMatchWorker, JOB_MATCH_SELECT } from "@/lib/match-data";

export default async function WorkerHome() {
  const user = await requireRole("worker");
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: wp }, { data: skills }, { data: exps }, apps, saved, { data: jobs }, worker, cfg] = await Promise.all([
    supabase.from("worker_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("worker_skills").select("skill_id").eq("worker_id", user.id),
    supabase.from("worker_experiences").select("id").eq("worker_id", user.id),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("worker_id", user.id),
    supabase.from("saved_jobs").select("job_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("job_offers").select(JOB_MATCH_SELECT).eq("status", "activa").or(`closes_at.is.null,closes_at.gte.${today}`).limit(60),
    loadMatchWorker(supabase, user.id),
    getMatchConfig(supabase),
  ]);

  const checklist = [
    { done: !!user.fullName && !!user.phone, text: "Datos de contacto", href: "/trabajador/perfil" },
    { done: !!wp?.headline, text: "Título y presentación", href: "/trabajador/perfil" },
    { done: (skills?.length ?? 0) > 0, text: "Habilidades", href: "/trabajador/perfil" },
    { done: (exps?.length ?? 0) > 0, text: "Experiencia", href: "/trabajador/perfil" },
    { done: !!wp?.cv_path || !!wp?.cv_generated_data, text: "CV (subido o generado)", href: "/trabajador/cv" },
  ];
  const pct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const top = worker
    ? (jobs ?? []).map((j: any) => ({ j, m: computeMatch(worker, jobRowToMatchJob(j), cfg.weights) })).sort((a, b) => b.m.score - a.m.score).slice(0, 3)
    : [];

  return (
    <>
      <PageHeader title={`Hola, ${user.fullName.split(" ")[0] || "bienvenido/a"}`} description="Este es el resumen de tu búsqueda de empleo." actions={<Button asChild variant="accent"><Link href="/empleos">Buscar empleo</Link></Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Perfil completo</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-3xl font-bold">{pct} %</p><Progress value={pct} label="Perfil completo" /></CardContent></Card>
        <Card><CardHeader><CardTitle>Postulaciones</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{apps.count ?? 0}</p><Button asChild variant="link" className="px-0"><Link href="/trabajador/postulaciones">Ver estados <ArrowRight /></Link></Button></CardContent></Card>
        <Card><CardHeader><CardTitle>Ofertas guardadas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{saved.count ?? 0}</p><Button asChild variant="link" className="px-0"><Link href="/trabajador/guardadas">Verlas <ArrowRight /></Link></Button></CardContent></Card>
      </div>

      {pct < 100 && (
        <Card className="mt-4"><CardHeader><CardTitle>Completa tu perfil para recibir mejores recomendaciones</CardTitle></CardHeader>
          <CardContent><ul className="grid gap-2 sm:grid-cols-2">{checklist.map((c) => (
            <li key={c.text}><Link href={c.href} className="flex items-center gap-2 hover:underline">{c.done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}<span className={c.done ? "text-muted-foreground line-through" : "font-medium"}>{c.text}</span></Link></li>))}</ul></CardContent></Card>
      )}

      {top.length > 0 && (
        <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl">Empleos que podrían interesarte</h2><Button asChild variant="link"><Link href="/trabajador/recomendados">Ver todos <ArrowRight /></Link></Button></div>
          <div className="grid gap-4 lg:grid-cols-3">{top.map(({ j, m }) => <JobCard key={j.id} job={j} score={m.score} />)}</div></section>
      )}
      <div className="mt-6"><CulCard compact /></div>
    </>
  );
}
