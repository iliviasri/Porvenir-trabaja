import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Building2, CalendarClock, CheckCircle2, MapPin, Users, XCircle } from "lucide-react";
import { Alert, Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplyForm, SaveJobButton } from "@/components/forms/job-actions";
import { VerificationBadge, VerificationDisclaimer } from "@/components/shared/verification";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { OFFER_TYPE_NOTICE, label } from "@/lib/constants";
import { formatDate, formatSalary } from "@/lib/utils";
import { computeMatch, SCORE_DISCLAIMER } from "@/lib/matching";
import { getMatchConfig, jobRowToMatchJob, loadMatchWorker, JOB_MATCH_SELECT } from "@/lib/match-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Oferta" };
  const supabase = await createClient();
  const { data } = await supabase.from("job_offers").select("title, businesses(trade_name)").eq("id", id).maybeSingle();
  return { title: data ? `${data.title} · ${(data as any).businesses?.trade_name ?? ""}` : "Oferta no encontrada" };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: job } = await supabase.from("job_offers").select(`${JOB_MATCH_SELECT}, businesses(id, trade_name, status, is_public, description, address)`).eq("id", id).maybeSingle();
  if (!job) notFound();

  const user = await getCurrentUser();
  const isWorker = !!user?.roles.includes("worker");
  const isOpen = job.status === "activa" && (!job.closes_at || job.closes_at >= new Date().toISOString().slice(0, 10));

  let match = null, saved = false, applied = false, hasProfile = false;
  if (isWorker && user) {
    const [worker, cfg, savedRow, appRow] = await Promise.all([
      loadMatchWorker(supabase, user.id), getMatchConfig(supabase),
      supabase.from("saved_jobs").select("job_id").eq("user_id", user.id).eq("job_id", id).maybeSingle(),
      supabase.from("applications").select("id").eq("worker_id", user.id).eq("job_id", id).maybeSingle(),
    ]);
    if (worker) { match = computeMatch(worker, jobRowToMatchJob(job), cfg.weights); hasProfile = worker.skills.length > 0; }
    saved = !!savedRow.data; applied = !!appRow.data;
  }
  const biz = (job as any).businesses;
  const skills = (job.job_required_skills ?? []).map((r: any) => r.skills?.name).filter(Boolean);

  return (
    <div className="page-container">
      <nav className="mb-4 text-sm"><Link href="/empleos" className="text-primary underline">← Volver a empleos</Link></nav>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={job.offer_type === "empleo_dependiente" ? "default" : "warning"}>{label(job.offer_type)}</Badge>
              {job.job_categories?.name && <Badge variant="secondary">{job.job_categories.name}</Badge>}
              {job.is_demo && <Badge variant="outline">Dato de demostración</Badge>}
              {!isOpen && <Badge variant="destructive">Convocatoria no disponible ({label(job.status)})</Badge>}
            </div>
            <h1 className="text-3xl">{job.title}</h1>
            <p className="flex items-center gap-2 text-lg text-muted-foreground"><Building2 className="size-5" /> {biz?.trade_name}</p>
          </header>

          {OFFER_TYPE_NOTICE[job.offer_type] && <Alert variant="warning" title="Tipo de oportunidad">{OFFER_TYPE_NOTICE[job.offer_type]}</Alert>}

          <Card><CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <div><p className="text-sm text-muted-foreground">Remuneración</p><p className="text-lg font-semibold">{formatSalary(job.salary_min, job.salary_max)}</p></div>
            <div><p className="text-sm text-muted-foreground">Jornada y modalidad</p><p className="font-semibold">{label(job.schedule_type)} · {label(job.modality)}</p>{job.schedule_text && <p className="text-sm">{job.schedule_text}</p>}</div>
            <div className="flex items-start gap-2"><MapPin className="mt-1 size-4 text-primary" /><div><p className="text-sm text-muted-foreground">Lugar</p><p className="font-semibold">{job.address}, El Porvenir</p></div></div>
            <div className="flex items-start gap-2"><Users className="mt-1 size-4 text-primary" /><div><p className="text-sm text-muted-foreground">Vacantes</p><p className="font-semibold">{job.vacancies}</p></div></div>
            <div><p className="text-sm text-muted-foreground">Experiencia solicitada</p><p className="font-semibold">{Number(job.experience_min_years) > 0 ? `${job.experience_min_years} año(s)` : "No se exige"}</p></div>
            <div className="flex items-start gap-2"><CalendarClock className="mt-1 size-4 text-primary" /><div><p className="text-sm text-muted-foreground">Publicada / cierre</p><p className="font-semibold">{formatDate(job.published_at)}{job.closes_at ? ` · cierra ${formatDate(job.closes_at)}` : ""}</p></div></div>
          </CardContent></Card>

          <section><h2 className="mb-2 text-xl">Descripción del puesto</h2><p className="whitespace-pre-line leading-relaxed">{job.description}</p></section>
          {skills.length > 0 && <section><h2 className="mb-2 text-xl">Habilidades solicitadas</h2><div className="flex flex-wrap gap-2">{skills.map((s: string) => <Badge key={s} variant="outline" className="text-sm">{s}</Badge>)}</div></section>}

          <section className="space-y-2 rounded-lg border bg-card p-4">
            <h2 className="text-lg">Sobre la empresa</h2>
            <div className="flex flex-wrap items-center gap-2"><strong>{biz?.trade_name}</strong><VerificationBadge status={biz?.status ?? "registrado"} /></div>
            {biz?.description && <p className="text-muted-foreground">{biz.description}</p>}
            <VerificationDisclaimer />
            {biz?.is_public && <Button asChild variant="outline" size="sm"><Link href={`/empresas/${biz.id}`}>Ver ficha de la empresa</Link></Button>}
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {isOpen && (
            !user ? (
              <Card><CardHeader><CardTitle>¿Te interesa este trabajo?</CardTitle></CardHeader><CardContent className="space-y-3">
                <p className="text-muted-foreground">Crea tu cuenta gratis o ingresa para postular.</p>
                <Button asChild size="lg" className="w-full"><Link href={`/login?next=/empleos/${id}`}>Ingresar para postular</Link></Button>
                <Button asChild variant="outline" className="w-full"><Link href="/registro?rol=worker">Crear cuenta de trabajador</Link></Button></CardContent></Card>
            ) : isWorker ? (
              <>
                <ApplyForm jobId={id} alreadyApplied={applied} hasProfile={hasProfile} />
                <SaveJobButton jobId={id} saved={saved} />
              </>
            ) : (<Alert variant="info">Estás usando una cuenta de empresa. Solo las cuentas de trabajador pueden postular.</Alert>)
          )}

          {match && (
            <Card>
              <CardHeader><CardTitle>Tu compatibilidad: {match.score} %</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{match.summary}</p>
                <ul className="space-y-1.5 text-sm">
                  {match.criteria.map((c) => (
                    <li key={c.key} className="flex items-start gap-2">
                      {c.fraction >= 0.7 ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-accent" />}
                      <span><strong>{c.label}:</strong> {c.detail}</span>
                    </li>
                  ))}
                </ul>
                {match.unmet.length > 0 && <div className="rounded-md bg-muted p-3 text-sm"><p className="font-semibold">Aún te falta:</p><ul className="list-disc pl-5">{match.unmet.map((u) => <li key={u}>{u}</li>)}</ul></div>}
                <p className="text-xs text-muted-foreground">{SCORE_DISCLAIMER}</p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
