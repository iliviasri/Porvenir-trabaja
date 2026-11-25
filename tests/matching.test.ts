import { describe, it, expect } from "vitest";
import { computeMatch, normalizeWeights, DEFAULT_WEIGHTS, type MatchWorker, type MatchJob } from "@/lib/matching";

const worker: MatchWorker = {
  skills: ["Aparado de calzado", "Corte de cuero", "Pegado de suelas", "Armado de calzado"],
  availability: "inmediata",
  schedule_pref: ["tiempo_completo"],
  modality_pref: ["presencial"],
  years_experience: 3,
  exp_sector_ids: ["calzado"],
  main_sector_id: "calzado",
  in_district: true,
  travel_ok: false,
  expected_salary_min: 1200,
};
const job: MatchJob = {
  required_skills: [
    { name: "Aparado de calzado", required: true },
    { name: "Corte de cuero", required: true },
    { name: "Pegado de suelas", required: true },
    { name: "Armado de calzado", required: true },
    { name: "Acabado de calzado", required: true },
  ],
  experience_min_years: 2,
  category_id: "calzado",
  schedule_type: "tiempo_completo",
  modality: "presencial",
  salary_min: 1300,
  salary_max: 1500,
};

describe("MATCH LABORAL", () => {
  it("calcula un puntaje 0-100 explicable", () => {
    const r = computeMatch(worker, job);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.matched_skills).toHaveLength(4);
    expect(r.missing_skills).toEqual(["Acabado de calzado"]);
    expect(r.summary).toContain("Cumple 4 de 5 habilidades");
    expect(r.unmet.some((u) => u.includes("Acabado de calzado"))).toBe(true);
    expect(r.criteria).toHaveLength(5);
  });

  it("puntaje perfecto cuando cumple todo", () => {
    const r = computeMatch({ ...worker, skills: [...worker.skills, "Acabado de calzado"] }, job);
    expect(r.score).toBe(100);
    expect(r.unmet).toHaveLength(0);
  });

  it("es determinista (misma entrada, misma salida)", () => {
    expect(computeMatch(worker, job)).toEqual(computeMatch(worker, job));
  });

  it("compara habilidades sin importar tildes ni mayúsculas", () => {
    const r = computeMatch({ ...worker, skills: ["APARADO DE CALZADO", "corte de cuero"] }, job);
    expect(r.matched_skills).toContain("Aparado de calzado");
    expect(r.matched_skills).toContain("Corte de cuero");
  });

  it("las ponderaciones configurables cambian el resultado", () => {
    const heavySkills = computeMatch({ ...worker, skills: [] }, job, { skills: 90, experience: 5, availability: 2, location_modality: 2, preferences: 1 });
    const lightSkills = computeMatch({ ...worker, skills: [] }, job, { skills: 5, experience: 50, availability: 20, location_modality: 15, preferences: 10 });
    expect(lightSkills.score).toBeGreaterThan(heavySkills.score);
  });

  it("normaliza ponderaciones inválidas", () => {
    expect(normalizeWeights({ skills: -5 as number })).toBeTruthy();
    expect(normalizeWeights({ skills: 0, experience: 0, availability: 0, location_modality: 0, preferences: 0 })).toEqual(DEFAULT_WEIGHTS);
  });

  it("indica experiencia insuficiente sin descartar al postulante", () => {
    const r = computeMatch({ ...worker, years_experience: 0.5 }, { ...job, experience_min_years: 3 });
    expect(r.unmet.some((u) => u.startsWith("Experiencia"))).toBe(true);
    expect(r.score).toBeGreaterThan(0);
  });

  it("no usa atributos sensibles: ignorar campos extra en la entrada", () => {
    const withSensitive = { ...worker, age: 19, gender: "F", nationality: "X", disability: true } as unknown as MatchWorker;
    expect(computeMatch(withSensitive, job).score).toBe(computeMatch(worker, job).score);
  });

  it("oferta sin habilidades listadas no penaliza", () => {
    const r = computeMatch(worker, { ...job, required_skills: [] });
    expect(r.criteria.find((c) => c.key === "skills")!.fraction).toBe(1);
  });
});
