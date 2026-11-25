/**
 * MATCH LABORAL — motor determinista, explicable y auditable.
 *
 * - Criterios y ponderaciones configurables (tabla matching_config).
 * - NO utiliza atributos sensibles (edad, sexo, nacionalidad, estado civil, discapacidad,
 *   apariencia, etc.). Los tipos de entrada ni siquiera los admiten.
 * - El puntaje es INFORMATIVO: nunca rechaza candidatos; la decisión final es de la empresa.
 */
import { slugify } from "@/lib/utils";
import { label } from "@/lib/constants";

export interface MatchWeights {
  skills: number;
  experience: number;
  availability: number;
  location_modality: number;
  preferences: number;
}

export const DEFAULT_WEIGHTS: MatchWeights = { skills: 40, experience: 25, availability: 15, location_modality: 10, preferences: 10 };
export const MATCH_ALGORITHM_VERSION = "determinista-1.0";

export interface MatchWorker {
  skills: string[];
  availability: string;
  schedule_pref: string[];
  modality_pref: string[];
  years_experience: number;
  exp_sector_ids: string[];
  main_sector_id?: string | null;
  in_district: boolean;
  travel_ok: boolean;
  expected_salary_min?: number | null;
}

export interface MatchJob {
  required_skills: { name: string; required: boolean }[];
  experience_min_years: number;
  category_id?: string | null;
  schedule_type: string;
  modality: string;
  salary_min?: number | null;
  salary_max?: number | null;
}

export interface CriterionResult {
  key: keyof MatchWeights;
  label: string;
  weight: number;
  fraction: number;
  points: number;
  detail: string;
}

export interface MatchResult {
  score: number;
  criteria: CriterionResult[];
  matched_skills: string[];
  missing_skills: string[];
  reasons: string[];
  unmet: string[];
  summary: string;
  algorithm: string;
}

const AVAILABILITY_VALUE: Record<string, number> = { inmediata: 1, una_semana: 0.8, un_mes: 0.5, no_disponible: 0 };
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function normalizeWeights(w?: Partial<MatchWeights> | null): MatchWeights {
  const merged = { ...DEFAULT_WEIGHTS, ...(w ?? {}) };
  const clean = Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0]));
  const total = Object.values(clean).reduce((a, b) => a + b, 0);
  return (total > 0 ? clean : DEFAULT_WEIGHTS) as unknown as MatchWeights;
}

export function computeMatch(worker: MatchWorker, job: MatchJob, weightsIn?: Partial<MatchWeights> | null): MatchResult {
  const weights = normalizeWeights(weightsIn);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const reasons: string[] = [];
  const unmet: string[] = [];

  // 1) Habilidades
  const workerSlugs = new Set(worker.skills.map(slugify));
  const reqs = job.required_skills;
  const matched: string[] = [];
  const missing: string[] = [];
  let wTotal = 0;
  let wMatched = 0;
  for (const s of reqs) {
    const w = s.required ? 1 : 0.5;
    wTotal += w;
    if (workerSlugs.has(slugify(s.name))) {
      wMatched += w;
      matched.push(s.name);
    } else {
      missing.push(s.name);
      if (s.required) unmet.push(`Habilidad solicitada que aún no registras: ${s.name}`);
    }
  }
  const skillsFraction = reqs.length === 0 ? 1 : wMatched / wTotal;
  const skillsDetail =
    reqs.length === 0
      ? "La oferta no pide habilidades específicas."
      : `Cumple ${matched.length} de ${reqs.length} habilidades solicitadas.`;
  if (reqs.length > 0 && matched.length > 0) reasons.push(skillsDetail + (matched.length ? ` (${matched.join(", ")})` : ""));

  // 2) Experiencia
  const minYears = job.experience_min_years ?? 0;
  const base = minYears <= 0 ? 1 : clamp01(worker.years_experience / minYears);
  const sectorKnown = !!job.category_id;
  const sectorMatch = sectorKnown && (worker.exp_sector_ids.includes(job.category_id!) || worker.main_sector_id === job.category_id);
  const expFraction = base * (sectorKnown && !sectorMatch ? 0.75 : 1);
  let expDetail: string;
  if (minYears <= 0) expDetail = "La oferta no exige experiencia mínima.";
  else expDetail = `Tienes ${worker.years_experience} año(s) de experiencia; la oferta pide ${minYears}.`;
  if (sectorMatch) {
    expDetail += " Tienes experiencia en el mismo sector.";
    reasons.push("Tienes experiencia en el sector de la oferta.");
  } else if (sectorKnown) {
    expDetail += " No registras experiencia en este sector.";
  }
  if (minYears > 0 && worker.years_experience >= minYears) reasons.push(`Cumples la experiencia mínima (${minYears} año(s)).`);
  if (minYears > 0 && worker.years_experience < minYears) unmet.push(`Experiencia: se piden ${minYears} año(s) y registras ${worker.years_experience}.`);

  // 3) Disponibilidad y horario
  const availValue = AVAILABILITY_VALUE[worker.availability] ?? 0.5;
  const schedOk = worker.schedule_pref.length === 0 || worker.schedule_pref.includes(job.schedule_type);
  const availFraction = 0.6 * availValue + 0.4 * (schedOk ? 1 : 0.4);
  const availDetail = `Disponibilidad: ${label(worker.availability).toLowerCase()}. Horario ${label(job.schedule_type).toLowerCase()}: ${schedOk ? "compatible con tus preferencias" : "distinto a tus preferencias"}.`;
  if (availValue >= 0.8) reasons.push(`Disponibilidad ${label(worker.availability).toLowerCase()}.`);
  if (worker.availability === "no_disponible") unmet.push("Indicaste que no estás disponible actualmente.");
  if (!schedOk) unmet.push(`El horario (${label(job.schedule_type).toLowerCase()}) no coincide con tus preferencias.`);

  // 4) Ubicación y modalidad
  const modOk = worker.modality_pref.length === 0 || worker.modality_pref.includes(job.modality);
  const locOk = worker.in_district || worker.travel_ok;
  const locFraction = 0.6 * (modOk ? 1 : 0.3) + 0.4 * (locOk ? 1 : 0.4);
  const locDetail = `Modalidad ${label(job.modality).toLowerCase()}: ${modOk ? "compatible" : "distinta a tu preferencia"}. Ubicación en El Porvenir: ${locOk ? "compatible" : "podría quedar lejos de ti"}.`;
  if (modOk) reasons.push(`La modalidad (${label(job.modality).toLowerCase()}) coincide con tu preferencia.`);
  else unmet.push(`La modalidad (${label(job.modality).toLowerCase()}) no coincide con tu preferencia.`);

  // 5) Preferencias (remuneración esperada)
  let prefFraction = 1;
  let prefDetail = "Sin preferencia salarial registrada o la oferta indica «a convenir».";
  const offered = job.salary_max ?? job.salary_min ?? null;
  if (worker.expected_salary_min && offered != null) {
    prefFraction = clamp01(offered / worker.expected_salary_min);
    prefDetail =
      prefFraction >= 1
        ? "La remuneración ofrecida alcanza tu expectativa mínima."
        : `La remuneración ofrecida (S/ ${offered}) es menor a tu expectativa mínima (S/ ${worker.expected_salary_min}).`;
    if (prefFraction < 1) unmet.push(prefDetail);
    else reasons.push(prefDetail);
  }

  const build = (key: keyof MatchWeights, lbl: string, fraction: number, detail: string): CriterionResult => ({
    key, label: lbl, weight: weights[key], fraction, points: Math.round(((fraction * weights[key]) / totalWeight) * 1000) / 10, detail,
  });
  const criteria = [
    build("skills", "Habilidades", skillsFraction, skillsDetail),
    build("experience", "Experiencia", expFraction, expDetail),
    build("availability", "Disponibilidad y horario", availFraction, availDetail),
    build("location_modality", "Ubicación y modalidad", locFraction, locDetail),
    build("preferences", "Preferencias", prefFraction, prefDetail),
  ];
  const score = Math.round(criteria.reduce((acc, c) => acc + (c.fraction * c.weight) / totalWeight, 0) * 100);

  const summary =
    `Compatibilidad del ${score} %. ` +
    (reqs.length ? `Cumple ${matched.length} de ${reqs.length} habilidades solicitadas. ` : "") +
    (sectorMatch ? "Tiene experiencia en el sector. " : "") +
    (unmet.length ? `Pendiente: ${unmet.length} requisito(s) por completar.` : "No hay requisitos pendientes.");

  return { score, criteria, matched_skills: matched, missing_skills: missing, reasons, unmet, summary: summary.trim(), algorithm: MATCH_ALGORITHM_VERSION };
}

export const SCORE_DISCLAIMER =
  "El puntaje es solo informativo y se calcula con criterios objetivos (habilidades, experiencia, disponibilidad, modalidad y preferencias). No rechaza a nadie automáticamente: la decisión final la toma la empresa.";
