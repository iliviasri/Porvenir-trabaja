import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { transcribeAudio, transcribeConfigured } from "@/lib/ai/transcribe";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
const MAX = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await authorize("worker");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!transcribeConfigured()) {
    return NextResponse.json({ unavailable: true, error: "La transcripción de voz no está configurada en este entorno. Puedes escribir tu experiencia en el cuadro de texto." }, { status: 503 });
  }
  if (!(await rateLimit(`transcribe:${auth.user.id}`, 10, 3600))) return NextResponse.json({ error: "Alcanzaste el límite de audios por hora." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File)) return NextResponse.json({ error: "Adjunta un audio." }, { status: 400 });
  if (file.size === 0 || file.size > MAX) return NextResponse.json({ error: "El audio debe pesar menos de 4 MB (aprox. 2 minutos)." }, { status: 400 });
  if (!/^(audio|video)\//.test(file.type)) return NextResponse.json({ error: "Formato de audio no permitido." }, { status: 400 });
  try {
    const text = await transcribeAudio(file);
    if (!text) return NextResponse.json({ error: "No se entendió el audio. Intenta grabar de nuevo." }, { status: 422 });
    return NextResponse.json({ text });
  } catch (e) {
    logError("cv.transcribe", e);
    return NextResponse.json({ error: "No se pudo transcribir el audio ahora." }, { status: 502 });
  }
}
