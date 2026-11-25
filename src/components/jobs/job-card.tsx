import Link from "next/link";
import { Building2, Clock, MapPin, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { formatDate, formatSalary } from "@/lib/utils";
import { label } from "@/lib/constants";

export function JobCard({ job, score, footer }: { job: any; score?: number; footer?: React.ReactNode }) {
  const isPractice = job.offer_type?.startsWith("practicas") || job.offer_type === "otro";
  return (
    <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={isPractice ? "warning" : "default"}>{label(job.offer_type)}</Badge>
        {job.job_categories?.name && <Badge variant="secondary">{job.job_categories.name}</Badge>}
        {job.is_demo && <Badge variant="outline">Dato de demostración</Badge>}
        {score != null && <Badge variant={score >= 70 ? "success" : score >= 40 ? "warning" : "secondary"}>Compatibilidad {score} %</Badge>}
      </div>
      <h3 className="text-lg font-semibold leading-snug">
        <Link href={`/empleos/${job.id}`} className="hover:text-primary hover:underline">{job.title}</Link>
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Building2 className="size-4" /> {job.businesses?.trade_name ?? "Empresa"}</p>
      <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
        <div className="flex items-center gap-2"><Wallet className="size-4 text-primary" /><dt className="sr-only">Remuneración</dt><dd>{formatSalary(job.salary_min, job.salary_max)}</dd></div>
        <div className="flex items-center gap-2"><Clock className="size-4 text-primary" /><dt className="sr-only">Jornada</dt><dd>{label(job.schedule_type)} · {label(job.modality)}</dd></div>
        <div className="flex items-center gap-2"><MapPin className="size-4 text-primary" /><dt className="sr-only">Ubicación</dt><dd>{job.address}, El Porvenir</dd></div>
      </dl>
      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
        <span>Publicada {formatDate(job.published_at ?? job.created_at)}</span>
        {job.vacancies > 1 && <span>{job.vacancies} vacantes</span>}
      </div>
      {footer && <div className="mt-3 border-t pt-3">{footer}</div>}
    </Card>
  );
}
