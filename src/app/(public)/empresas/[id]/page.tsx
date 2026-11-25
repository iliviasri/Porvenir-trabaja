import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/job-card";
import { VerificationBadge, VerificationDisclaimer } from "@/components/shared/verification";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Empresa" };
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("trade_name").eq("id", id).eq("is_public", true).maybeSingle();
  return { title: data?.trade_name ?? "Empresa no encontrada" };
}

export default async function BusinessPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("*, job_categories(name), business_contacts(*)").eq("id", id).eq("is_public", true).neq("status", "suspendido").maybeSingle();
  if (!b) notFound();
  const { data: jobs } = await supabase.from("job_offers").select("*, businesses(trade_name), job_categories(name)").eq("business_id", id).eq("status", "activa").order("published_at", { ascending: false });
  const c = (b as any).business_contacts;
  const contact = c && c.show_public ? c : null;
  const rucInfo = b.ruc ? (b.ruc_verified ? `RUC ${b.ruc} (verificado internamente con fuente citada)` : `RUC ${b.ruc} (declarado por el negocio, no verificado)`) : null;

  return (
    <div className="page-container space-y-6">
      <nav className="text-sm"><Link href="/empresas" className="text-primary underline">← Volver al directorio</Link></nav>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><VerificationBadge status={b.status} />{b.is_demo && <Badge variant="outline">Dato de demostración</Badge>}{(b as any).job_categories?.name && <Badge variant="secondary">{(b as any).job_categories.name}</Badge>}</div>
        <h1 className="text-3xl">{b.trade_name}</h1>
        <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> {b.address ?? "El Porvenir"}, El Porvenir, Trujillo</p>
        <VerificationDisclaimer />
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {b.description && <section><h2 className="mb-2 text-xl">Sobre el negocio</h2><p className="whitespace-pre-line">{b.description}</p></section>}
          {b.products_services && <section><h2 className="mb-2 text-xl">Productos y servicios</h2><p className="whitespace-pre-line">{b.products_services}</p></section>}
          <section>
            <h2 className="mb-3 text-xl">Ofertas de trabajo activas</h2>
            {jobs && jobs.length ? <div className="grid gap-4 md:grid-cols-2">{jobs.map((j: any) => <JobCard key={j.id} job={j} />)}</div> : <p className="text-muted-foreground">Este negocio no tiene ofertas activas por ahora.</p>}
          </section>
        </div>
        <aside>
          <Card><CardHeader><CardTitle>Contacto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {contact ? (
                <ul className="space-y-2">
                  {contact.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-primary" /> <a className="underline" href={`tel:+51${contact.phone}`}>{contact.phone}</a></li>}
                  {contact.whatsapp && <li className="flex items-center gap-2"><MessageCircle className="size-4 text-primary" /> <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/51${contact.whatsapp}`}>WhatsApp {contact.whatsapp}</a></li>}
                  {contact.email && <li className="flex items-center gap-2"><Mail className="size-4 text-primary" /> <a className="underline" href={`mailto:${contact.email}`}>{contact.email}</a></li>}
                  {contact.website && <li className="flex items-center gap-2"><Globe className="size-4 text-primary" /> <span className="break-all">{contact.website}</span></li>}
                </ul>
              ) : <p className="text-muted-foreground">El negocio no publicó datos de contacto.</p>}
              {rucInfo && <p className="border-t pt-3 text-sm text-muted-foreground">{rucInfo}</p>}
            </CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
