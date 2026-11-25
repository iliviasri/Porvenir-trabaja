import Link from "next/link";
import type { Metadata } from "next";
import { Briefcase, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { JobCard } from "@/components/jobs/job-card";
import { createClient } from "@/lib/supabase/server";
import { MODALITIES, OFFER_TYPES, SCHEDULES, label } from "@/lib/constants";
import { safeSearchTerm } from "@/lib/utils";

export const metadata: Metadata = { title: "Buscar empleo en El Porvenir" };
const PAGE_SIZE = 12;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function JobsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = safeSearchTerm(one(sp.q));
  const sector = one(sp.sector), type = one(sp.tipo), modality = one(sp.modalidad), schedule = one(sp.jornada);
  const minSalary = Number(one(sp.sueldo)) || 0;
  const maxExp = one(sp.exp) === "" ? null : Number(one(sp.exp));
  const sort = one(sp.orden) === "sueldo" ? "sueldo" : "recientes";
  const page = Math.max(1, Number(one(sp.pagina)) || 1);

  const supabase = await createClient();
  const { data: categories } = await supabase.from("job_categories").select("id, slug, name").eq("active", true).order("sort_order");
  const cat = categories?.find((c: any) => c.slug === sector);
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase.from("job_offers").select("*, businesses(trade_name), job_categories(name)", { count: "exact" })
    .eq("status", "activa").or(`closes_at.is.null,closes_at.gte.${today}`);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (cat) query = query.eq("category_id", cat.id);
  if ((OFFER_TYPES as readonly string[]).includes(type)) query = query.eq("offer_type", type);
  if ((MODALITIES as readonly string[]).includes(modality)) query = query.eq("modality", modality);
  if ((SCHEDULES as readonly string[]).includes(schedule)) query = query.eq("schedule_type", schedule);
  if (minSalary > 0) query = query.gte("salary_max", minSalary);
  if (maxExp != null && !Number.isNaN(maxExp)) query = query.lte("experience_min_years", maxExp);
  query = sort === "sueldo" ? query.order("salary_max", { ascending: false, nullsFirst: false }) : query.order("published_at", { ascending: false });
  const { data: jobs, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, sector, tipo: type, modalidad: modality, jornada: schedule, sueldo: minSalary ? String(minSalary) : "", exp: one(sp.exp), orden: sort === "sueldo" ? "sueldo" : "" })) if (v) u.set(k, v);
    if (p > 1) u.set("pagina", String(p));
    return `/empleos?${u.toString()}`;
  };

  return (
    <div className="page-container">
      <h1 className="text-3xl">Empleos en El Porvenir</h1>
      <p className="mt-1 text-muted-foreground">Todas las ofertas están ubicadas en el distrito de El Porvenir, Trujillo.</p>

      <form method="get" className="mt-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4" role="search">
        <div className="md:col-span-2">
          <label htmlFor="q" className="mb-1.5 block text-sm font-medium">¿Qué trabajo buscas?</label>
          <Input id="q" name="q" defaultValue={q} placeholder="Cargo, tarea o palabra clave" />
        </div>
        <div><label htmlFor="sector" className="mb-1.5 block text-sm font-medium">Sector</label>
          <Select id="sector" name="sector" defaultValue={sector}><option value="">Todos</option>{categories?.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
        <div><label htmlFor="tipo" className="mb-1.5 block text-sm font-medium">Tipo de oportunidad</label>
          <Select id="tipo" name="tipo" defaultValue={type}><option value="">Todas</option>{OFFER_TYPES.map((o) => <option key={o} value={o}>{label(o)}</option>)}</Select></div>
        <div><label htmlFor="modalidad" className="mb-1.5 block text-sm font-medium">Modalidad</label>
          <Select id="modalidad" name="modalidad" defaultValue={modality}><option value="">Todas</option>{MODALITIES.map((o) => <option key={o} value={o}>{label(o)}</option>)}</Select></div>
        <div><label htmlFor="jornada" className="mb-1.5 block text-sm font-medium">Jornada</label>
          <Select id="jornada" name="jornada" defaultValue={schedule}><option value="">Todas</option>{SCHEDULES.map((o) => <option key={o} value={o}>{label(o)}</option>)}</Select></div>
        <div><label htmlFor="sueldo" className="mb-1.5 block text-sm font-medium">Sueldo mínimo (S/)</label>
          <Input id="sueldo" name="sueldo" inputMode="numeric" defaultValue={minSalary || ""} placeholder="Ej.: 1200" /></div>
        <div><label htmlFor="exp" className="mb-1.5 block text-sm font-medium">Experiencia que me piden (máx.)</label>
          <Select id="exp" name="exp" defaultValue={one(sp.exp)}><option value="">Cualquiera</option><option value="0">Sin experiencia</option><option value="1">Hasta 1 año</option><option value="2">Hasta 2 años</option><option value="3">Hasta 3 años</option><option value="5">Hasta 5 años</option></Select></div>
        <div className="flex items-end gap-2 md:col-span-4">
          <Button type="submit"><Search /> Buscar</Button>
          <Button asChild variant="ghost"><Link href="/empleos">Limpiar filtros</Link></Button>
          <div className="ml-auto flex items-center gap-2"><label htmlFor="orden" className="text-sm">Ordenar:</label>
            <Select id="orden" name="orden" defaultValue={sort} className="h-10 w-44"><option value="recientes">Más recientes</option><option value="sueldo">Mayor sueldo</option></Select></div>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">{total} {total === 1 ? "oferta encontrada" : "ofertas encontradas"}</p>
      {jobs && jobs.length > 0 ? (
        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{jobs.map((j: any) => <JobCard key={j.id} job={j} />)}</div>
      ) : (
        <div className="mt-3"><EmptyState icon={Briefcase} title="No encontramos ofertas con esos filtros" action={<Button asChild variant="secondary"><Link href="/empleos">Ver todas las ofertas</Link></Button>}>Prueba con otras palabras o quita algún filtro.</EmptyState></div>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Paginación">
          {page > 1 && <Button asChild variant="outline"><Link href={qs(page - 1)}>← Anterior</Link></Button>}
          <span className="text-sm">Página {page} de {pages}</span>
          {page < pages && <Button asChild variant="outline"><Link href={qs(page + 1)}>Siguiente →</Link></Button>}
        </nav>
      )}
    </div>
  );
}
