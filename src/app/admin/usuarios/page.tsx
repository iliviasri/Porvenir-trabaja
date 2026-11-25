import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/feedback";
import { PrivacyResolveControls, UserControls } from "@/components/forms/admin-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatDateTime } from "@/lib/utils";
import { label } from "@/lib/constants";

export const metadata = { title: "Usuarios y privacidad" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireRole("admin", "/admin/usuarios");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: profiles }, { data: roles }, { data: reqs }, emails] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, is_active, is_demo, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("privacy_requests").select("id, user_id, type, status, message, created_at, profiles(full_name)").in("status", ["pendiente", "en_proceso"]).order("created_at"),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  const emailMap = new Map((emails.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const roleMap = new Map<string, string[]>();
  (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]));
  const term = (sp.q ?? "").trim().toLowerCase();
  const list = (profiles ?? []).filter((p: any) => !term || p.full_name.toLowerCase().includes(term) || (emailMap.get(p.id) ?? "").toLowerCase().includes(term));
  return (
    <>
      <PageHeader title="Usuarios y privacidad" description="Gestión de cuentas, roles y solicitudes ARCO. Los cambios quedan en auditoría." />
      {reqs && reqs.length > 0 && (
        <section className="mb-8"><h2 className="mb-3 text-xl">Solicitudes ARCO abiertas ({reqs.length})</h2>
          <ul className="space-y-3">{reqs.map((r: any) => (
            <li key={r.id}><Card className="space-y-2 p-4"><div className="flex flex-wrap items-center gap-2"><strong className="capitalize">{r.type}</strong><StatusBadge status={r.status} /><span className="text-sm text-muted-foreground">{r.profiles?.full_name} · {formatDateTime(r.created_at)}</span></div>
              {r.message && <p className="text-sm">{r.message}</p>}<PrivacyResolveControls id={r.id} userId={r.user_id} type={r.type} /></Card></li>))}</ul></section>)}
      <form method="get" className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por nombre o correo" aria-label="Buscar usuario" className="h-11 w-full max-w-sm rounded-md border bg-background px-3" /><button className="rounded-md bg-secondary px-4 font-medium">Buscar</button></form>
      <ul className="space-y-2">{list.map((p: any) => (
        <li key={p.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0"><p className="font-semibold">{p.full_name || "(sin nombre)"} {p.is_demo && <Badge variant="outline">demo</Badge>} {!p.is_active && <Badge variant="destructive">desactivado</Badge>}</p>
            <p className="truncate text-sm text-muted-foreground">{emailMap.get(p.id)} · {(roleMap.get(p.id) ?? []).map(label).join(", ")} · alta {formatDate(p.created_at)}</p></div>
          <UserControls userId={p.id} active={p.is_active} roles={roleMap.get(p.id) ?? []} isSelf={p.id === me.id} />
        </Card></li>))}</ul>
    </>
  );
}
