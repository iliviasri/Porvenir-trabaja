import "server-only";
import { z } from "zod";
import { extractJson, llmComplete, llmConfigured } from "@/lib/ai/llm";
import { FORMALIZA_EXPLAIN_SYSTEM, FORMALIZA_EXTRACT_SYSTEM } from "@/lib/ai/prompts";
import { templateExplanation, type Requirement } from "@/lib/formalization";
import { PREMISES, RUC_DECLARED } from "@/lib/constants";
import { logError } from "@/lib/logger";

const lenient = z.object({
  ruc_status: z.enum(RUC_DECLARED).nullable().catch(null),
  premises: z.enum(PREMISES).nullable().catch(null),
  workers_count: z.number().int().min(0).max(10000).nullable().catch(null),
  wants_hire: z.boolean().nullable().catch(null),
  sells_to_businesses: z.boolean().nullable().catch(null),
  has_municipal_license: z.enum(["si", "no", "no_sabe"]).nullable().catch(null),
  activity_summary: z.string().max(300).nullable().catch(null),
});
export type ExtractedAnswers = z.infer<typeof lenient>;

/** La IA solo PROPONE respuestas a partir del texto libre; el usuario las revisa y confirma en el formulario. */
export async function extractAnswers(freeText: string): Promise<ExtractedAnswers> {
  const out = await llmComplete({ system: FORMALIZA_EXTRACT_SYSTEM, messages: [{ role: "user", content: freeText }], maxTokens: 400, temperature: 0 });
  const parsed = lenient.safeParse(extractJson(out) ?? {});
  return parsed.success ? parsed.data : lenient.parse({});
}

export function missingFields(a: Partial<ExtractedAnswers>) {
  const labels: Record<string, string> = {
    ruc_status: "si ya tienes RUC", premises: "dónde funciona tu negocio (local, taller, domicilio, calle…)",
    workers_count: "cuántas personas trabajan contigo", wants_hire: "si quieres contratar más personas",
    sells_to_businesses: "si vendes a otras empresas", has_municipal_license: "si ya tienes licencia municipal",
  };
  return Object.keys(labels).filter((k) => (a as Record<string, unknown>)[k] == null).map((k) => labels[k]!);
}

/** Explicación personalizada de la ruta. La ruta ya viene del catálogo; la IA no agrega obligaciones. */
export async function explainRoute(
  businessName: string,
  answers: Record<string, unknown>,
  applicable: Requirement[],
): Promise<{ text: string; ai: boolean }> {
  const fallback = { text: templateExplanation(applicable), ai: false };
  if (!llmConfigured()) return fallback;
  try {
    const ruta = applicable.map((r) => ({ codigo: r.code, categoria: r.category, titulo: r.title, resumen: r.summary, fuente: r.source_label, advertencia: r.caveats }));
    const text = await llmComplete({
      system: FORMALIZA_EXPLAIN_SYSTEM,
      messages: [{ role: "user", content: `<negocio>${businessName}</negocio>\n<respuestas>${JSON.stringify(answers)}</respuestas>\n<ruta>${JSON.stringify(ruta)}</ruta>` }],
      maxTokens: 500,
      temperature: 0.3,
    });
    return text ? { text: text.slice(0, 2500), ai: true } : fallback;
  } catch (e) {
    logError("formaliza.explain.failed", e);
    return fallback;
  }
}
