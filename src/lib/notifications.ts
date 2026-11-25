import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

/** Crea una notificación interna. Se usa el cliente de servicio porque los usuarios no pueden insertar notificaciones ajenas. */
export async function notify(userId: string, title: string, body?: string, link?: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({ user_id: userId, title, body: body ?? null, link: link ?? null });
    if (error) throw error;
  } catch (e) {
    logError("notify.failed", e, { userId });
  }
}

export async function notifyBusinessMembers(businessId: string, title: string, body?: string, link?: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("business_members").select("user_id").eq("business_id", businessId);
    await Promise.all((data ?? []).map((m: { user_id: string }) => notify(m.user_id, title, body, link)));
  } catch (e) {
    logError("notify.business.failed", e, { businessId });
  }
}

export async function notifyAdmins(title: string, body?: string, link?: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    await Promise.all((data ?? []).map((m: { user_id: string }) => notify(m.user_id, title, body, link)));
  } catch (e) {
    logError("notify.admins.failed", e);
  }
}
