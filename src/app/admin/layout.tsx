import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth";

export const metadata = { title: { default: "Administración", template: "%s · Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "/admin");
  const items = [
    { href: "/admin", label: "Observatorio" },
    { href: "/admin/usuarios", label: "Usuarios y privacidad" },
    { href: "/admin/empresas", label: "Negocios" },
    { href: "/admin/verificaciones", label: "Verificaciones" },
    { href: "/admin/ofertas", label: "Moderación de ofertas" },
    { href: "/admin/requisitos", label: "Requisitos y conocimiento" },
    { href: "/admin/categorias", label: "Sectores y matching" },
    { href: "/admin/auditoria", label: "Auditoría" },
  ];
  return <DashboardShell title="Administración" subtitle="PORVENIR TRABAJA" items={items} userName={user.fullName || user.email || ""}>{children}</DashboardShell>;
}
