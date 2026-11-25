import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: { default: "Panel de empresa", template: "%s · Empresa" } };

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("business", "/empresa");
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  const items = [
    { href: "/empresa", label: "Resumen" },
    { href: "/empresa/negocio", label: "Información del negocio" },
    { href: "/empresa/diagnostico", label: "Diagnóstico de formalización" },
    { href: "/empresa/ruta", label: "Ruta y seguimiento" },
    { href: "/empresa/documentos", label: "Documentación" },
    { href: "/empresa/ofertas", label: "Mis ofertas laborales" },
    { href: "/empresa/candidatos", label: "Candidatos" },
    { href: "/empresa/recomendaciones", label: "Recomendaciones de candidatos" },
    { href: "/empresa/notificaciones", label: "Notificaciones", badge: count ?? 0 },
    { href: "/cuenta/privacidad", label: "Privacidad" },
  ];
  return <DashboardShell title="Empresa" subtitle="Tu negocio en El Porvenir" items={items} userName={user.fullName || user.email || ""}>{children}</DashboardShell>;
}
