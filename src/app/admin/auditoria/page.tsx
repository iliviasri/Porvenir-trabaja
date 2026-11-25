import { PageHeader } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Auditoría" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireRole("admin", "/admin/auditoria");
  const supabase = await createClient();
  const { data } = await supabase.from("audit_logs").select("id, actor_id, action, entity, entity_id, metadata, created_at, profiles:actor_id(full_name)").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="Registro de auditoría" description="Últimas 200 acciones administrativas y sensibles." />
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-left text-sm">
        <caption className="sr-only">Registro de auditoría</caption>
        <thead className="bg-muted"><tr><th scope="col" className="p-3">Fecha</th><th scope="col" className="p-3">Actor</th><th scope="col" className="p-3">Acción</th><th scope="col" className="p-3">Entidad</th><th scope="col" className="p-3">Detalle</th></tr></thead>
        <tbody>{(data ?? []).map((a: any) => (<tr key={a.id} className="border-t align-top"><td className="whitespace-nowrap p-3">{formatDateTime(a.created_at)}</td><td className="p-3">{a.profiles?.full_name || (a.actor_id ? a.actor_id.slice(0, 8) : "sistema")}</td><td className="p-3 font-mono">{a.action}</td><td className="p-3">{a.entity}{a.entity_id ? ` · ${String(a.entity_id).slice(0, 8)}` : ""}</td><td className="max-w-xs break-words p-3 text-muted-foreground">{a.metadata ? JSON.stringify(a.metadata) : ""}</td></tr>))}</tbody>
      </table></div>
    </>
  );
}
