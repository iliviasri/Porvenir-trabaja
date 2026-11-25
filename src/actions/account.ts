"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, type ActionResult } from "@/lib/auth";
import { firstIssue, privacyRequestSchema } from "@/lib/validators";
import { notifyAdmins } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/** Derechos ARCO (Ley N.º 29733): acceso, rectificación, cancelación/eliminación y oposición. */
export async function createPrivacyRequest(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const parsed = privacyRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("privacy_requests").insert({ user_id: user.id, type: parsed.data.type, message: parsed.data.message || null });
  if (error) return { ok: false, error: "No se pudo registrar tu solicitud." };
  await audit(user.id, "privacy.request", "privacy_request", null, { type: parsed.data.type });
  await notifyAdmins("Nueva solicitud de privacidad", `Tipo: ${parsed.data.type}.`, "/admin/usuarios");
  revalidatePath("/cuenta/privacidad");
  return { ok: true, message: "Recibimos tu solicitud. La atenderemos y te avisaremos por notificación." };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
  return { ok: true, message: "Todas marcadas como leídas." };
}
