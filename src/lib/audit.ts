import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

/** Registra una acción relevante (administrativa o sensible) en audit_logs. No interrumpe el flujo si falla. */
export async function audit(actorId: string | null, action: string, entity: string, entityId?: string | null, metadata?: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({ actor_id: actorId, action, entity, entity_id: entityId ?? null, metadata: metadata ?? null });
    if (error) throw error;
  } catch (e) {
    logError("audit.failed", e, { action, entity });
  }
}
