import Link from "next/link";
import type { Metadata } from "next";
import { Building2, ExternalLink, Landmark, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { label, VERIFICATION_DISCLAIMER } from "@/lib/constants";

export const metadata: Metadata = { title: "Formaliza tu negocio" };

export default async function FormalizaPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data: reqs } = await supabase.from("formalization_requirements").select("id, code, category, title, summary, source_label, source_url, last_reviewed_at, version").eq("active", true).order("sort_order");
  const groups = ["tributaria", "municipal", "laboral"] as const;
  const cta = !user ? { href: "/registro?rol=business", text: "Crear cuenta de negocio" } : user.roles.includes("business") ? { href: "/empresa/diagnostico", text: "Hacer mi diagnóstico" } : null;

  const pillars = [
    { icon: Receipt, title: "1. Formalización tributaria", text: "RUC, régimen tributario y comprobantes de pago ante SUNAT." },
    { icon: Landmark, title: "2. Autorizaciones municipales", text: "Licencia de funcionamiento, zonificación, seguridad o comercio en la vía pública, según tu caso. Son independientes del RUC." },
    { icon: Users, title: "3. Obligaciones laborales", text: "Si tienes o quieres contratar trabajadores: registro, planilla, seguro y condiciones según tu régimen." },
  ];

  return (
    <div className="page-container space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl md:text-4xl">Formaliza tu negocio paso a paso</h1>
        <p className="text-lg text-muted-foreground">Cuéntanos tu situación con palabras sencillas y recibe una ruta personalizada con los trámites que te corresponden, los documentos que necesitas y los enlaces oficiales.</p>
        {cta && <Button asChild size="lg"><Link href={cta.href}>{cta.text}</Link></Button>}
      </header>

      <Alert variant="warning" title="Importante">Tener RUC <strong>no equivale</strong> a tener autorización municipal, ni todos los comerciantes ambulantes pueden obtener la misma autorización. {VERIFICATION_DISCLAIMER}</Alert>

      <section className="grid gap-4 md:grid-cols-3">
        {pillars.map((p) => (
          <Card key={p.title}><CardHeader><p.icon className="size-8 text-primary" /><CardTitle className="mt-2">{p.title}</CardTitle></CardHeader><CardContent className="text-muted-foreground">{p.text}</CardContent></Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl">Catálogo de trámites (orientativo)</h2>
        <p className="text-muted-foreground">Estos son los trámites que considera nuestro catálogo. Cuáles te aplican depende de tus respuestas en el diagnóstico. Cada uno enlaza a la fuente oficial y muestra su fecha de revisión.</p>
        {groups.map((g) => {
          const list = (reqs ?? []).filter((r: any) => r.category === g);
          if (!list.length) return null;
          return (
            <div key={g} className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg"><Building2 className="size-5 text-primary" /> {label(g)}</h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {list.map((r: any) => (
                  <li key={r.id} className="rounded-lg border bg-card p-4">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary">Revisado {formatDate(r.last_reviewed_at)} · v{r.version}</Badge>
                      {r.source_url ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">{r.source_label} <ExternalLink className="size-3" /></a> : <span>{r.source_label}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
