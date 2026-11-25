import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";

/** Garantiza que existan las habilidades (catálogo normalizado por slug) y devuelve sus ids. */
export async function ensureSkills(supabase: SupabaseClient, names: string[]): Promise<{ id: string; slug: string; name: string }[]> {
  const rows = names.map((name) => ({ name, slug: slugify(name) })).filter((r) => r.slug.length >= 2);
  if (rows.length === 0) return [];
  await supabase.from("skills").upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
  const { data } = await supabase.from("skills").select("id, slug, name").in("slug", rows.map((r) => r.slug));
  return data ?? [];
}

/** Reemplaza el conjunto de habilidades de un trabajador. */
export async function syncWorkerSkills(supabase: SupabaseClient, workerId: string, names: string[], opts: { merge?: boolean } = {}) {
  const skills = await ensureSkills(supabase, names);
  const wanted = new Set(skills.map((s) => s.id));
  const { data: current } = await supabase.from("worker_skills").select("skill_id").eq("worker_id", workerId);
  const have = new Set((current ?? []).map((r: { skill_id: string }) => r.skill_id));
  const toAdd = [...wanted].filter((id) => !have.has(id));
  const toRemove = opts.merge ? [] : [...have].filter((id) => !wanted.has(id));
  if (toAdd.length) await supabase.from("worker_skills").insert(toAdd.map((skill_id) => ({ worker_id: workerId, skill_id })));
  if (toRemove.length) await supabase.from("worker_skills").delete().eq("worker_id", workerId).in("skill_id", toRemove);
}

/** Reemplaza las habilidades solicitadas de una oferta. */
export async function syncJobSkills(supabase: SupabaseClient, jobId: string, names: string[]) {
  const skills = await ensureSkills(supabase, names);
  await supabase.from("job_required_skills").delete().eq("job_id", jobId);
  if (skills.length) await supabase.from("job_required_skills").insert(skills.map((s) => ({ job_id: jobId, skill_id: s.id, required: true })));
}
