import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { homePathFor, type Role } from "@/lib/auth-paths";

export { homePathFor };
export type { Role };

export interface CurrentUser {
  id: string;
  email: string | undefined;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  roles: Role[];
}

/** Usuario autenticado + perfil + roles (verificado con el servidor de Auth, no solo la cookie). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, is_active").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  return {
    id: user.id,
    email: user.email,
    fullName: profile?.full_name ?? "",
    phone: profile?.phone ?? null,
    isActive: profile?.is_active ?? true,
    roles: (roles ?? []).map((r: { role: Role }) => r.role),
  };
});

/** Exige un rol en páginas del servidor. Redirige si no hay sesión o el rol no corresponde. */
export async function requireRole(role: Role, next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (!user.isActive) redirect("/login?error=cuenta_inactiva");
  if (!user.roles.includes(role)) redirect(homePathFor(user.roles));
  return user;
}

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Autorización en Server Actions / Route Handlers: devuelve el usuario o un error (no lanza). */
export async function authorize(role: Role): Promise<{ user: CurrentUser } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Debes iniciar sesión." };
  if (!user.isActive) return { error: "Tu cuenta está desactivada." };
  if (!user.roles.includes(role)) return { error: "No tienes permisos para esta acción." };
  return { user };
}
