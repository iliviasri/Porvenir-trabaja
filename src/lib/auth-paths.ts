export type Role = "worker" | "business" | "admin";

/** Panel de aterrizaje según los roles del usuario. */
export function homePathFor(roles: Role[]) {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("business")) return "/empresa";
  return "/trabajador";
}
