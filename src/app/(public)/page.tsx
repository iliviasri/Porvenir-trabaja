import Link from "next/link";
import { ArrowRight, Bot, FileText, Search, ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { JobCard } from "@/components/jobs/job-card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INTERNAL_DATA_DISCLAIMER } from "@/lib/constants";

async function publicStats() {
  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const [jobs, biz, workers] = await Promise.all([
      admin.from("job_offers").select("id", { count: "exact", head: true }).eq("status", "activa").eq("is_demo", false).or(`closes_at.is.null,closes_at.gte.${today}`),
      admin.from("businesses").select("id", { count: "exact", head: true }).eq("is_demo", false).neq("status", "suspendido"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", false),
    ]);
    return { jobs: jobs.count ?? 0, businesses: biz.count ?? 0, users: workers.count ?? 0 };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: latest }, { data: categories }, stats] = await Promise.all([
    supabase.from("job_offers").select("*, businesses(trade_name), job_categories(name)").eq("status", "activa").or(`closes_at.is.null,closes_at.gte.${today}`).order("published_at", { ascending: false }).limit(6),
    supabase.from("job_categories").select("slug, name").eq("active", true).order("sort_order"),
    publicStats(),
  ]);

  const modules = [
    { icon: Search, title: "Empleo local", text: "Ofertas de trabajo solo en El Porvenir: calzado, cuero, confección, comercio, gastronomía y más.", href: "/empleos", cta: "Buscar empleo" },
    { icon: ShieldCheck, title: "IA Formaliza", text: "Cuéntanos de tu negocio y recibe una ruta clara de trámites ante SUNAT, MTPE y la municipalidad.", href: "/formaliza", cta: "Formalizar mi negocio" },
    { icon: FileText, title: "CV Inteligente", text: "Cuenta tu experiencia con tu voz o escribiendo y obtén un CV profesional en PDF.", href: "/registro?rol=worker", cta: "Crear mi CV" },
    { icon: Store, title: "Directorio de negocios", text: "Conoce los negocios de El Porvenir y sus ofertas de trabajo activas.", href: "/empresas", cta: "Ver directorio" },
  ];

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container grid items-center gap-8 py-12 md:py-16 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <p className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">Solo El Porvenir · Trujillo, La Libertad</p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Trabajo y formalización para nuestro distrito</h1>
            <p className="max-w-xl text-lg text-primary-foreground/90">Encuentra empleo cerca de casa, forma tu CV en minutos y recibe orientación paso a paso para formalizar tu negocio.</p>
            <form action="/empleos" className="flex max-w-xl flex-col gap-2 sm:flex-row" role="search">
              <label htmlFor="q" className="sr-only">Buscar empleo</label>
              <Input id="q" name="q" placeholder="Ej.: aparador, vendedora, cocinero…" className="h-12 border-0 text-foreground" />
              <Button type="submit" variant="accent" size="lg"><Search /> Buscar</Button>
            </form>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild variant="secondary" size="lg"><Link href="/registro?rol=worker">Soy trabajador</Link></Button>
              <Button asChild variant="outline" size="lg" className="border-white/40 bg-transparent text-white hover:bg-white/10"><Link href="/registro?rol=business">Tengo un negocio</Link></Button>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
            {stats && (stats.jobs + stats.businesses + stats.users > 0) ? (
              <>
                <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">La plataforma hoy</p>
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {[[stats.jobs, "ofertas activas"], [stats.businesses, "negocios"], [stats.users, "usuarios"]].map(([n, l]) => (
                    <div key={String(l)}><dt className="sr-only">{l}</dt><dd className="text-3xl font-extrabold">{n}</dd><p className="text-sm text-primary-foreground/80">{l}</p></div>
                  ))}
                </dl>
                <p className="mt-4 text-xs text-primary-foreground/70">{INTERNAL_DATA_DISCLAIMER}</p>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-semibold">Estamos empezando</p>
                <p className="text-primary-foreground/85">Sé de los primeros en registrarte: publica tu oferta o crea tu perfil para que las empresas te encuentren.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="page-container">
        <h2 className="mb-6 text-2xl md:text-3xl">¿Qué puedes hacer aquí?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <Card key={m.title} className="flex flex-col">
              <CardHeader><m.icon className="size-9 text-primary" /><CardTitle className="mt-2">{m.title}</CardTitle></CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4"><p className="text-muted-foreground">{m.text}</p>
                <Button asChild variant="link" className="mt-auto justify-start px-0"><Link href={m.href}>{m.cta} <ArrowRight /></Link></Button></CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="page-container pt-0">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 className="text-2xl md:text-3xl">Ofertas recientes</h2>
          <Button asChild variant="outline"><Link href="/empleos">Ver todas</Link></Button>
        </div>
        {latest && latest.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{latest.map((j: any) => <JobCard key={j.id} job={j} />)}</div>
        ) : (
          <div className="rounded-lg border border-dashed bg-card p-8 text-center text-muted-foreground">Aún no hay ofertas publicadas. Las empresas de El Porvenir pueden publicar las suyas desde su panel.</div>
        )}
        {categories && categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Sectores">
            {categories.map((c: any) => <Button key={c.slug} asChild size="sm" variant="secondary"><Link href={`/empleos?sector=${c.slug}`}>{c.name}</Link></Button>)}
          </div>
        )}
      </section>

      <section className="page-container pt-0">
        <Card className="border-primary/30 bg-secondary/50">
          <CardContent className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center">
            <Bot className="size-12 shrink-0 text-primary" />
            <div className="flex-1">
              <h2 className="text-xl">Asistente de ayuda siempre a la mano</h2>
              <p className="text-muted-foreground">Usa el botón «Ayuda» (abajo a la derecha) para preguntar cómo postular, crear tu CV o formalizar tu negocio. Responde con fuentes oficiales y fecha de actualización.</p>
            </div>
            <Button asChild variant="accent" size="lg"><Link href="/servicios">Certificado Único Laboral</Link></Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
