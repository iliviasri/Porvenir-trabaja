import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}

/** Límite por ventana fija, persistido en PostgreSQL (funciona en serverless). Falla cerrado ante errores. */
export async function rateLimit(key: string, max?: number, windowSeconds?: number): Promise<boolean> {
  const m = max ?? Number(process.env.AI_RATE_LIMIT_MAX ?? 20);
  const w = windowSeconds ?? Number(process.env.AI_RATE_LIMIT_WINDOW_SECONDS ?? 600);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", { p_key: key, p_max: m, p_window_seconds: w });
    if (error) throw error;
    return data === true;
  } catch (e) {
    logError("ratelimit.failed", e, { key });
    return false;
  }
}
