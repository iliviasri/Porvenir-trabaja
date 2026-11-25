import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-controls";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { VerificationBadge, VerificationDisclaimer } from "@/components/shared/verification";
import { createClient } from "@/lib/supabase/server";
import { safeSearchTerm, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Directorio de empresas de El Porvenir" };
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = safeSearchTerm(one(sp.q));
  const sector = one(sp.sector);
  const onlyVerified = one(sp.verificadas) === "1";
  const supabase = await createClient();
  const { data: categories } = await supabase.from("job_categories").select("id, slug, name").eq("active", true).order("sort_order");
  const cat = categories?.find((c: any) => c.slug === sector);

  let query = supabase.from("businesses").select("id, trade_name, description, products_services, address, status, is_demo, job_categories(name)").eq("is_public", true).neq("status", "suspendido").order("trade_name").limit(60);
  if (q) query = query.or(`trade_name.ilike.%${q}%,description.ilike.%${q}%,products_services.ilike.%${q}%`);
  if (cat) query = query.eq("sector_id", cat.id);
  if (onlyVerified) query = query.eq("status", "documentacion_verificada");
  const { data: businesses } = await query;

  const ids = (businesses ?? []).map((b: any) => b.id);
  const { data: jobs } = ids.length ? await supabase.from("job_offers").select("business_id").eq("status", "activa").in("business_id", ids) : { data: [] as any[] };
  const jobCount = new Map<string, number>();
  for (const j of jobs ?? []) jobCount.set(j.business_id, (jobCount.get(j.business_id) ?? 0) + 1);

  return (
    <div className="page-container">
      <h1 className="text-3xl">Directorio de empresas</h1>
      <p className="mt-1 text-muted-foreground">Negocios de El Porvenir que decidieron mostrar su ficha pública.</p>
      <form method="get" className="mt-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_220px_auto_auto]" role="search">
        <div><label htmlFor="q" className="mb-1.5 block text-sm font-medium">Buscar negocio</label><Input id="q" name="q" defaultValue={q} placeholder="Nombre, producto o servicio" /></div>
        <div><label htmlFor="sector" className="mb-1.5 block text-sm font-medium">Rubro</label><Select id="sector" name="sector" defaultValue={sector}><option value="">Todos</option>{categories?.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
        <label className="flex items-end gap-2 pb-3"><input type="checkbox" name="verificadas" value="1" defaultChecked={onlyVerified} className="size-5 accent-[hsl(var(--primary))]" /> Solo con documentación verificada</label>
        <div className="flex items-end"><Button type="submit">Filtrar</Button></div>
      </form>
      <VerificationDisclaimer className="mt-3 text-sm text-muted-foreground" />

      {businesses && businesses.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b: any) => (
            <Card key={b.id} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap gap-2"><VerificationBadge status={b.status} />{b.is_demo && <Badge variant="outline">Dato de demostración</Badge>}</div>
              <h2 className="text-lg font-semibold"><Link href={`/empresas/${b.id}`} className="hover:text-primary hover:underline">{b.trade_name}</Link></h2>
              {b.job_categories?.name && <Badge variant="secondary" className="w-fit">{b.job_categories.name}</Badge>}
              {b.description && <p className="text-muted-foreground">{truncate(b.description, 140)}</p>}
              <p className="flex items-center gap-1.5 text-sm"><MapPin className="size-4 text-primary" /> {b.address ?? "El Porvenir"}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">{jobCount.get(b.id) ? `${jobCount.get(b.id)} oferta(s) activa(s)` : "Sin ofertas activas"}</span>
                <Button asChild size="sm" variant="outline"><Link href={`/empresas/${b.id}`}>Ver ficha</Link></Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-6"><EmptyState icon={Store} title="Aún no hay negocios con esos criterios" action={<Button asChild variant="secondary"><Link href="/registro?rol=business">Registrar mi negocio</Link></Button>}>Si tienes un negocio en El Porvenir, regístralo y activa tu ficha pública.</EmptyState></div>
      )}
    </div>
  );
}
