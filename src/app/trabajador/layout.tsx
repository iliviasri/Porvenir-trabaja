import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: { default: "Panel del trabajador", template: "%s · Trabajador" } };

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("worker", "/trabajador");
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  const items = [
    { href: "/trabajador", label: "Resumen" },
    { href: "/trabajador/perfil", label: "Mi perfil" },
    { href: "/trabajador/cv", label: "Mi CV inteligente" },
    { href: "/trabajador/recomendados", label: "Empleos recomendados" },
    { href: "/trabajador/postulaciones", label: "Mis postulaciones" },
    { href: "/trabajador/guardadas", label: "Ofertas guardadas" },
    { href: "/trabajador/servicios", label: "Servicios laborales (CUL)" },
    { href: "/trabajador/notificaciones", label: "Notificaciones", badge: count ?? 0 },
    { href: "/cuenta/privacidad", label: "Privacidad" },
  ];
  return <DashboardShell title="Trabajador" subtitle="Tu búsqueda de empleo" items={items} userName={user.fullName || user.email || ""}>{children}</DashboardShell>;
}
