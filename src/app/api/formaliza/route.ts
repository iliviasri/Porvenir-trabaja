import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { formalizaRequestSchema, firstIssue } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { llmConfigured } from "@/lib/ai/llm";
import { extractAnswers, missingFields } from "@/lib/ai/formaliza";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

/** IA FORMALIZA · paso 1: propone respuestas a partir del relato libre. El usuario confirma/edita antes de generar la ruta. */
export async function POST(req: Request) {
  const auth = await authorize("business");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!llmConfigured()) {
    return NextResponse.json({ unavailable: true, error: "La comprensión del relato con IA no está disponible en este entorno. Completa el formulario manualmente: la ruta se genera igual con las reglas del catálogo." }, { status: 503 });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const parsed = formalizaRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  if (!(await rateLimit(`formaliza:${auth.user.id}`))) return NextResponse.json({ error: "Demasiadas consultas seguidas. Espera unos minutos." }, { status: 429 });
  try {
    const answers = await extractAnswers(parsed.data.free_text);
    return NextResponse.json({ answers, missing: missingFields(answers) });
  } catch (e) {
    logError("formaliza.extract", e);
    return NextResponse.json({ error: "No pudimos analizar tu texto ahora. Completa el formulario manualmente." }, { status: 502 });
  }
}
