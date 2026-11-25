import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { requireRole } from "@/lib/auth";
import { loadStats, parseFilter, type Dist } from "@/lib/stats";
import { INTERNAL_DATA_DISCLAIMER, label } from "@/lib/constants";

export const metadata = { title: "Observatorio" };
export const dynamic = "force-dynamic";

function Bars({ data, title }: { data: Dist; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>
      {data.length === 0 ? <p className="text-muted-foreground">Sin datos en el periodo.</p> : (
        <ul className="space-y-2" aria-label={title}>{data.map((d) => (
          <li key={d.key} className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 text-sm">
            <div><div className="mb-0.5 truncate">{label(d.key)}</div><div className="h-2.5 rounded-full bg-muted" role="presentation"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${(d.count / max) * 100}%` }} /></div></div>
            <span className="text-right font-semibold tabular-nums">{d.count}</span>
          </li>))}</ul>)}
    </CardContent></Card>
  );
}

export default async function AdminStats({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; demo?: string }> }) {
  await requireRole("admin", "/admin");
  const sp = await searchParams;
  const f = parseFilter(sp);
  const s = await loadStats(f);
  const kpis = [
    ["Trabajadores registrados", s.workers], ["Negocios registrados", s.businesses], ["Negocios con documentación verificada", s.formalizedBiz],
    ["Ofertas creadas", s.jobsAll], ["Ofertas activas", s.jobsActive], ["Postulaciones", s.apps], ["Documentos aprobados", s.verifiedDocs],
  ] as const;
  const qs = new URLSearchParams({ ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}), ...(f.includeDemo ? { demo: "1" } : {}) }).toString();
  return (
    <>
      <PageHeader title="Observatorio laboral de El Porvenir" description="Cifras calculadas en tiempo real con los registros de la plataforma." />
      <Alert variant="warning" className="mb-4">{INTERNAL_DATA_DISCLAIMER}</Alert>
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div><label htmlFor="desde" className="mb-1.5 block text-sm font-medium">Desde</label><Input id="desde" type="date" name="desde" defaultValue={f.from ?? ""} /></div>
        <div><label htmlFor="hasta" className="mb-1.5 block text-sm font-medium">Hasta</label><Input id="hasta" type="date" name="hasta" defaultValue={f.to ?? ""} /></div>
        <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="demo" value="1" defaultChecked={f.includeDemo} className="size-4" /> Incluir datos de demostración</label>
        <Button type="submit" variant="secondary">Aplicar</Button>
      </form>
      {f.includeDemo && <p className="mb-3 text-sm text-muted-foreground">Las cifras incluyen datos ficticios de demostración (marcados internamente). Desmarca la opción para ver solo datos reales.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{kpis.map(([k, v]) => (<Card key={k}><CardContent className="pt-5"><p className="text-3xl font-bold tabular-nums">{v}</p><p className="text-sm text-muted-foreground">{k}</p></CardContent></Card>))}</div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Bars title="Ofertas por sector" data={s.jobsByCategory} />
        <Bars title="Ofertas por estado" data={s.jobStatus} />
        <Bars title="Ofertas por tipo (empleo / prácticas)" data={s.offerType} />
        <Bars title="Postulaciones por estado" data={s.appStatus} />
        <Bars title="Negocios por estado de seguimiento" data={s.businessStatus} />
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Exportar CSV</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
        {["ofertas", "postulaciones", "negocios", "trabajadores"].map((t) => <Button key={t} asChild variant="outline" size="sm"><a href={`/api/admin/export?type=${t}${qs ? `&${qs}` : ""}`} download><Download /> {t}</a></Button>)}
        <p className="w-full text-xs text-muted-foreground">Los datos de trabajadores se exportan anonimizados (sin nombre, teléfono ni correo).</p></CardContent></Card>
    </>
  );
}
