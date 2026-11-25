import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, StatusBadge } from "@/components/ui/feedback";
import { BusinessForm } from "@/components/forms/business-forms";
import { VerificationDisclaimer } from "@/components/shared/verification";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness } from "@/lib/business";
import { formatDate } from "@/lib/utils";
import type { BusinessInput } from "@/lib/validators";

export const metadata = { title: "Información del negocio" };

export default async function BusinessInfoPage() {
  const user = await requireRole("business", "/empresa/negocio");
  const supabase = await createClient();
  const [business, { data: sectors }] = await Promise.all([getMyBusiness(supabase, user.id), supabase.from("job_categories").select("id, name").eq("active", true).order("sort_order")]);
  const { data: contact } = business ? await supabase.from("business_contacts").select("*").eq("business_id", business.id).maybeSingle() : { data: null };
  const defaults: BusinessInput = {
    trade_name: business?.trade_name ?? "", legal_name: business?.legal_name ?? "", ruc: business?.ruc ?? "", ruc_declared: business?.ruc_declared ?? "no_sabe",
    sector_id: business?.sector_id ?? "", activity_description: business?.activity_description ?? "", description: business?.description ?? "",
    products_services: business?.products_services ?? "", premises: business?.premises ?? "local_fijo", workers_count: business?.workers_count ?? 0,
    address: business?.address ?? "", is_public: business?.is_public ?? false, contact_phone: contact?.phone ?? "", contact_whatsapp: contact?.whatsapp ?? "",
    contact_email: contact?.email ?? "", contact_website: contact?.website ?? "", show_contact: contact?.show_public ?? false,
  };
  return (
    <>
      <PageHeader title={business ? "Información del negocio" : "Registra tu negocio"} description="Tu negocio puede ser formal o informal. Esta información alimenta tu ruta y tu ficha pública." actions={business && <StatusBadge status={business.status} />} />
      {business && (
        <div className="mb-5 space-y-3">
          {business.ruc && <Alert variant={business.ruc_verified ? "success" : "info"} title={business.ruc_verified ? "RUC verificado internamente" : "RUC declarado (no verificado)"}>
            {business.ruc_verified ? `Fuente: ${business.ruc_verified_source} · ${formatDate(business.ruc_verified_at)}.` : "Lo declaraste tú. La administración puede marcarlo como verificado citando una fuente."}</Alert>}
          {business.admin_notes && <Alert variant="warning" title="Observación de la administración">{business.admin_notes}</Alert>}
          <VerificationDisclaimer />
        </div>
      )}
      <Card><CardContent className="pt-5"><BusinessForm defaults={defaults} sectors={sectors ?? []} isNew={!business} /></CardContent></Card>
    </>
  );
}
