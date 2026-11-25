import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_WEIGHTS, normalizeWeights, type MatchJob, type MatchWeights, type MatchWorker } from "@/lib/matching";
import { DISTRICT } from "@/lib/constants";

export async function getMatchConfig(supabase: SupabaseClient): Promise<{ weights: MatchWeights; version: number }> {
  const { data } = await supabase.from("matching_config").select("weights, version").eq("id", 1).maybeSingle();
  return { weights: normalizeWeights(data?.weights ?? DEFAULT_WEIGHTS), version: data?.version ?? 1 };
}

/** Datos del trabajador para el motor de match. Solo campos laborales objetivos. */
export async function loadMatchWorker(supabase: SupabaseClient, userId: string): Promise<MatchWorker | null> {
  const [{ data: wp }, { data: profile }, { data: skills }, { data: exps }] = await Promise.all([
    supabase.from("worker_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("district").eq("id", userId).maybeSingle(),
    supabase.from("worker_skills").select("skills(name)").eq("worker_id", userId),
    supabase.from("worker_experiences").select("sector_id").eq("worker_id", userId),
  ]);
  if (!wp) return null;
  return {
    skills: (skills ?? []).map((s: any) => s.skills?.name).filter(Boolean),
    availability: wp.availability,
    schedule_pref: wp.schedule_pref ?? [],
    modality_pref: wp.modality_pref ?? [],
    years_experience: Number(wp.years_experience ?? 0),
    exp_sector_ids: (exps ?? []).map((e: any) => e.sector_id).filter(Boolean),
    main_sector_id: wp.main_sector_id,
    in_district: (profile?.district ?? DISTRICT) === DISTRICT,
    travel_ok: !!wp.travel_ok,
    expected_salary_min: wp.expected_salary_min != null ? Number(wp.expected_salary_min) : null,
  };
}

/** Convierte una fila de job_offers (con job_required_skills(required, skills(name))) en MatchJob. */
export function jobRowToMatchJob(row: any): MatchJob {
  return {
    required_skills: (row.job_required_skills ?? []).map((r: any) => ({ name: r.skills?.name ?? "", required: r.required })).filter((r: any) => r.name),
    experience_min_years: Number(row.experience_min_years ?? 0),
    category_id: row.category_id,
    schedule_type: row.schedule_type,
    modality: row.modality,
    salary_min: row.salary_min != null ? Number(row.salary_min) : null,
    salary_max: row.salary_max != null ? Number(row.salary_max) : null,
  };
}

/** Convierte una fila de candidate_cards en MatchWorker (sin datos de contacto ni atributos sensibles). */
export function candidateRowToMatchWorker(c: any): MatchWorker {
  return {
    skills: c.skills ?? [],
    availability: c.availability,
    schedule_pref: c.schedule_pref ?? [],
    modality_pref: c.modality_pref ?? [],
    years_experience: Number(c.years_experience ?? 0),
    exp_sector_ids: c.exp_sector_ids ?? [],
    main_sector_id: c.main_sector_id,
    in_district: true,
    travel_ok: !!c.travel_ok,
    expected_salary_min: c.expected_salary_min != null ? Number(c.expected_salary_min) : null,
  };
}

export const JOB_MATCH_SELECT = "*, businesses(trade_name), job_categories(name), job_required_skills(required, skills(name))";
