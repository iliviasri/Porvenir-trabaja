import { describe, it, expect } from "vitest";
import { appliesTo, buildRoute, computeProgress, evaluateCondition, nextBusinessStatus, parseRule, type Requirement } from "@/lib/formalization";

const req = (code: string, applies_when: Requirement["applies_when"], sort = 1): Requirement => ({
  id: code, code, version: 1, category: "tributaria", title: code, summary: "", plain_explanation: "", documents: [],
  applies_when, caveats: null, source_label: "x", source_url: null, last_reviewed_at: "2026-01-01", sort_order: sort,
});

describe("motor de reglas de formalización", () => {
  it("evalúa operadores", () => {
    expect(evaluateCondition({ field: "a", op: "eq", value: 1 }, { a: 1 })).toBe(true);
    expect(evaluateCondition({ field: "a", op: "neq", value: 1 }, { a: 2 })).toBe(true);
    expect(evaluateCondition({ field: "a", op: "in", value: ["x", "y"] }, { a: "y" })).toBe(true);
    expect(evaluateCondition({ field: "n", op: "gte", value: 1 }, { n: 0 })).toBe(false);
    expect(evaluateCondition({ field: "n", op: "gte", value: 1 }, { n: 3 })).toBe(true);
    expect(evaluateCondition({ field: "n", op: "lte", value: 3 }, { n: "3" })).toBe(false);
    expect(evaluateCondition({ field: "b", op: "truthy" }, { b: true })).toBe(true);
  });

  it("regla vacía aplica siempre; all/any se combinan", () => {
    expect(appliesTo({}, {})).toBe(true);
    expect(appliesTo({ all: [{ field: "a", op: "eq", value: 1 }], any: [{ field: "b", op: "truthy" }, { field: "c", op: "truthy" }] }, { a: 1, c: true })).toBe(true);
    expect(appliesTo({ all: [{ field: "a", op: "eq", value: 1 }], any: [{ field: "b", op: "truthy" }] }, { a: 1 })).toBe(false);
  });

  it("construye una ruta distinta para ambulante vs. taller con trabajadores", () => {
    const catalog = [
      req("RUC", { all: [{ field: "ruc_status", op: "in", value: ["no_tiene"] }] }, 1),
      req("LICENCIA", { all: [{ field: "premises", op: "in", value: ["local_fijo", "taller"] }] }, 2),
      req("AMBULANTE", { all: [{ field: "premises", op: "eq", value: "ambulante" }] }, 3),
      req("REMYPE", { all: [{ field: "workers_count", op: "gte", value: 1 }] }, 4),
    ];
    const taller = buildRoute(catalog, { ruc_status: "no_tiene", premises: "taller", workers_count: 3 });
    expect(taller.applicable.map((r) => r.code)).toEqual(["RUC", "LICENCIA", "REMYPE"]);
    const amb = buildRoute(catalog, { ruc_status: "tiene", premises: "ambulante", workers_count: 0 });
    expect(amb.applicable.map((r) => r.code)).toEqual(["AMBULANTE"]);
    // el ambulante NO recibe la licencia de funcionamiento de local
    expect(amb.notApplicable.map((r) => r.code)).toContain("LICENCIA");
  });

  it("progreso orientativo excluye 'no_aplica'", () => {
    const p = computeProgress([{ status: "completado" }, { status: "en_proceso" }, { status: "pendiente" }, { status: "no_aplica" }]);
    expect(p).toEqual({ total: 3, done: 1, inProgress: 1, pending: 1, percent: 33 });
    expect(computeProgress([]).percent).toBe(0);
  });

  it("el estado del negocio nunca pasa a 'verificada' automáticamente", () => {
    expect(nextBusinessStatus("registrado", { hasDiagnostic: true, anyStarted: false, docsSubmittedPending: false })).toBe("en_orientacion");
    expect(nextBusinessStatus("en_orientacion", { hasDiagnostic: true, anyStarted: true, docsSubmittedPending: false })).toBe("en_proceso_formalizacion");
    expect(nextBusinessStatus("en_proceso_formalizacion", { hasDiagnostic: true, anyStarted: true, docsSubmittedPending: true })).toBe("documentacion_en_revision");
    expect(nextBusinessStatus("suspendido", { hasDiagnostic: true, anyStarted: true, docsSubmittedPending: true })).toBe("suspendido");
    expect(nextBusinessStatus("documentacion_verificada", { hasDiagnostic: true, anyStarted: true, docsSubmittedPending: true })).toBe("documentacion_verificada");
  });

  it("valida el JSON de reglas del administrador", () => {
    expect(parseRule("").ok).toBe(true);
    expect(parseRule("{no json").ok).toBe(false);
    expect(parseRule('{"all":[{"field":"a","op":"raro"}]}').ok).toBe(false);
    expect(parseRule('{"all":[{"field":"a","op":"eq","value":1}]}').ok).toBe(true);
  });
});
