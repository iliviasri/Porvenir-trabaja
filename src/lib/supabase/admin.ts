import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con clave service_role: IGNORA RLS. Solo para tareas de servidor
 * ya autorizadas explícitamente (auditoría, notificaciones, límites, estadísticas, URLs firmadas).
 * Nunca importar desde componentes de cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL en el servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
