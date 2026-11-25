/**
 * Motor de reglas de formalización.
 * La RUTA se construye con un catálogo versionado y reglas verificables (applies_when).
 * La IA solo explica y personaliza; nunca decide qué obligaciones legales existen.
 */

export type Op = "eq" | "neq" | "in" | "gte" | "lte" | "truthy";
export interface Condition { field: string; op: Op; value?: unknown }
export interface Rule { all?: Condition[]; any?: Condition[] }
export type Answers = Record<string, unknown>;

export interface Requirement {
  id: string;
  code: string;
  version: number;
  category: "tributaria" | "municipal" | "laboral" | "otra";
  title: string;
  summary: string;
  plain_explanation: string;
  documents: string[];
  applies_when: Rule;
  caveats: string | null;
  source_label: string;
  source_url: string | null;
  last_reviewed_at: string;
  sort_order: number;
}

export function evaluateCondition(c: Condition, answers: Answers): boolean {
  const v = answers[c.field];
  switch (c.op) {
    case "eq": return v === c.value;
    case "neq": return v !== c.value;
    case "in": return Array.isArray(c.value) && c.value.includes(v);
    case "gte": return typeof v === "number" && typeof c.value === "number" && v >= c.value;
    case "lte": return typeof v === "number" && typeof c.value === "number" && v <= c.value;
    case "truthy": return Boolean(v);
    default: return false;
  }
}

/** Regla vacía = aplica siempre. `all`: todas se cumplen. `any`: al menos una se cumple. */
export function appliesTo(rule: Rule | null | undefined, answers: Answers): boolean {
  if (!rule) return true;
  const hasAll = Array.isArray(rule.all) && rule.all.length > 0;
  const hasAny = Array.isArray(rule.any) && rule.any.length > 0;
  if (!hasAll && !hasAny) return true;
  if (hasAll && !rule.all!.every((c) => evaluateCondition(c, answers))) return false;
  if (hasAny && !rule.any!.some((c) => evaluateCondition(c, answers))) return false;
  return true;
}

export function buildRoute(requirements: Requirement[], answers: Answers) {
  const sorted = [...requirements].sort((a, b) => a.sort_order - b.sort_order);
  return {
    applicable: sorted.filter((r) => appliesTo(r.applies_when, answers)),
    notApplicable: sorted.filter((r) => !appliesTo(r.applies_when, answers)),
  };
}

export interface TaskLike { status: "pendiente" | "en_proceso" | "completado" | "no_aplica" }

/** Porcentaje ORIENTATIVO de avance sobre requisitos aplicables (excluye "no_aplica"). */
export function computeProgress(tasks: TaskLike[]) {
  const applicable = tasks.filter((t) => t.status !== "no_aplica");
  const done = applicable.filter((t) => t.status === "completado").length;
  const inProgress = applicable.filter((t) => t.status === "en_proceso").length;
  const percent = applicable.length === 0 ? 0 : Math.round((done / applicable.length) * 100);
  return { total: applicable.length, done, inProgress, pending: applicable.length - done - inProgress, percent };
}

/** Estado del negocio sugerido según el avance (nunca llega a "verificada": eso es acción del administrador). */
export function nextBusinessStatus(
  current: string,
  opts: { hasDiagnostic: boolean; anyStarted: boolean; docsSubmittedPending: boolean },
) {
  if (current === "suspendido" || current === "documentacion_verificada") return current;
  if (opts.docsSubmittedPending) return "documentacion_en_revision";
  if (opts.anyStarted) return "en_proceso_formalizacion";
  if (opts.hasDiagnostic) return "en_orientacion";
  return current;
}

export function parseRule(json: string): { ok: true; rule: Rule } | { ok: false; error: string } {
  if (!json.trim()) return { ok: true, rule: {} };
  try {
    const rule = JSON.parse(json) as Rule;
    const ops: Op[] = ["eq", "neq", "in", "gte", "lte", "truthy"];
    for (const c of [...(rule.all ?? []), ...(rule.any ?? [])]) {
      if (!c || typeof c.field !== "string" || !ops.includes(c.op)) return { ok: false, error: "Cada condición necesita «field» y un «op» válido (eq, neq, in, gte, lte, truthy)." };
    }
    return { ok: true, rule };
  } catch {
    return { ok: false, error: "El JSON de reglas no es válido." };
  }
}

/** Explicación sin IA (plantilla) cuando el modelo de lenguaje no está configurado. */
export function templateExplanation(applicable: Requirement[]) {
  const by = (c: Requirement["category"]) => applicable.filter((r) => r.category === c).map((r) => r.title);
  const parts: string[] = [];
  const t = by("tributaria"), m = by("municipal"), l = by("laboral");
  if (t.length) parts.push(`Formalización tributaria (SUNAT): ${t.join("; ")}.`);
  if (m.length) parts.push(`Autorizaciones municipales: ${m.join("; ")}.`);
  if (l.length) parts.push(`Obligaciones laborales: ${l.join("; ")}.`);
  return (
    "Según tus respuestas, esta es tu ruta orientativa. " + parts.join(" ") +
    " Cada trámite se realiza ante la entidad oficial; esta plataforma no emite licencias ni autorizaciones."
  );
}
