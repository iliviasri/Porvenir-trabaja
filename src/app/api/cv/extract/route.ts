import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { cvExtractRequestSchema, firstIssue } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { extractJson, llmComplete, llmConfigured } from "@/lib/ai/llm";
import { CV_EXTRACT_SYSTEM } from "@/lib/ai/prompts";
import { extractKeywords } from "@/lib/cv-keywords";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const out = z.object({
  headline: z.string().max(120).catch(""),
  summary: z.string().max(1500).catch(""),
  skills: z.array(z.string().min(2).max(60)).max(25).catch([]),
  experiences: z
    .array(z.object({
      role_title: z.string().min(2).max(120),
      company: z.string().max(120).catch(""),
      months: z.number().int().min(0).max(720).catch(0),
      description: z.string().max(800).catch(""),
    }))
    .max(15)
    .catch([]),
});

/** CV INTELIGENTE · propone campos editables. Nada se guarda hasta que la persona los revise y confirme. */
export async function POST(req: Request) {
  const auth = await authorize("worker");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const parsed = cvExtractRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const text = parsed.data.text;

  if (!llmConfigured()) {
    // Sin IA: coincidencia por palabras clave, claramente etiquetada.
    const k = extractKeywords(text);
    return NextResponse.json({
      source: "palabras_clave",
      notice: "La IA no está configurada. Detectamos habilidades por palabras clave; completa el resto manualmente.",
      headline: "", summary: "", skills: k.skills,
      experiences: k.months ? [{ role_title: "", company: "", months: k.months, description: "" }] : [],
    });
  }
  if (!(await rateLimit(`cvextract:${auth.user.id}`))) return NextResponse.json({ error: "Demasiadas solicitudes. Espera unos minutos." }, { status: 429 });
  try {
    const raw = await llmComplete({ system: CV_EXTRACT_SYSTEM, messages: [{ role: "user", content: text }], maxTokens: 900, temperature: 0 });
    const data = out.parse(extractJson(raw) ?? {});
    return NextResponse.json({ source: "ia", ...data, experiences: data.experiences.filter((e) => e.role_title.trim()) });
  } catch (e) {
    logError("cv.extract", e);
    const k = extractKeywords(text);
    return NextResponse.json({
      source: "palabras_clave",
      notice: "No pudimos usar la IA en este momento. Detectamos habilidades por palabras clave; revisa y completa.",
      headline: "", summary: "", skills: k.skills,
      experiences: k.months ? [{ role_title: "", company: "", months: k.months, description: "" }] : [],
    });
  }
}
