import type { SupabaseClient } from "@supabase/supabase-js";
import { nextBusinessStatus } from "@/lib/formalization";

export async function getMyBusiness(supabase: SupabaseClient, userId: string): Promise<any | null> {
  const { data } = await supabase
    .from("business_members")
    .select("business_id, businesses(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as any)?.businesses ?? null;
}

/** Recalcula el estado del negocio a partir de diagnóstico, tareas y documentos (nunca llega a "verificada"). */
export async function refreshBusinessStatus(supabase: SupabaseClient, businessId: string) {
  const [{ data: biz }, { count: diagCount }, { data: tasks }, { data: docs }] = await Promise.all([
    supabase.from("businesses").select("status").eq("id", businessId).maybeSingle(),
    supabase.from("formalization_diagnostics").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("formalization_tasks").select("status").eq("business_id", businessId),
    supabase.from("business_documents").select("status").eq("business_id", businessId),
  ]);
  if (!biz) return;
  const next = nextBusinessStatus(biz.status, {
    hasDiagnostic: (diagCount ?? 0) > 0,
    anyStarted: (tasks ?? []).some((t: any) => t.status === "en_proceso" || t.status === "completado"),
    docsSubmittedPending: (docs ?? []).some((d: any) => d.status === "presentado"),
  });
  if (next !== biz.status) await supabase.from("businesses").update({ status: next }).eq("id", businessId);
}
