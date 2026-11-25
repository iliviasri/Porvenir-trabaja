import { NextResponse } from "next/server";
import { llmConfigured } from "@/lib/ai/llm";
import { transcribeConfigured } from "@/lib/ai/transcribe";

export const dynamic = "force-dynamic";

/** Estado de configuración (solo booleanos, nunca valores). Útil para verificar el despliegue en Vercel. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: { url: !!process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    ai: { llm: llmConfigured(), transcription: transcribeConfigured() },
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  });
}
