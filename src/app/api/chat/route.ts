import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { chatRequestSchema, firstIssue } from "@/lib/validators";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { llmComplete, llmConfigured } from "@/lib/ai/llm";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const INTENTS: { re: RegExp; label: string; href: string }[] = [
  { re: /\bcv\b|curr[ií]culum|hoja de vida/i, label: "Mi CV inteligente", href: "/trabajador/cv" },
  { re: /postul|empleo|trabajo|vacante|oferta|buscar/i, label: "Buscar empleo", href: "/empleos" },
  { re: /ruc|sunat|licencia|formaliz|municipal|tr[aá]mite|ambulante|negocio/i, label: "Formaliza tu negocio", href: "/formaliza" },
  { re: /diagn[oó]stico|ruta de/i, label: "Diagnóstico de formalización", href: "/empresa/diagnostico" },
  { re: /certificado|\bcul\b/i, label: "Servicios laborales (CUL)", href: "/servicios" },
  { re: /privacidad|datos personales|eliminar mi|borrar mi/i, label: "Privacidad de mis datos", href: "/cuenta/privacidad" },
  { re: /empresa|directorio|comerciante/i, label: "Directorio de empresas", href: "/empresas" },
];

const STOP = new Set(["para", "como", "que", "los", "las", "una", "uno", "por", "con", "del", "mis", "quiero", "puedo", "tengo", "necesito", "donde", "cual", "esta", "este"]);
function toTsQuery(message: string) {
  const words = [...new Set(message.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 4 && !STOP.has(w)))].slice(0, 8);
  return words.join(" or ");
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const { message, history, conversation_id } = parsed.data;

  const user = await getCurrentUser();
  const key = user ? `chat:u:${user.id}` : `chat:ip:${await clientIp()}`;
  if (!(await rateLimit(key))) {
    return NextResponse.json({ error: "Enviaste muchos mensajes seguidos. Espera unos minutos y vuelve a intentar." }, { status: 429 });
  }

  const supabase = await createClient();
  const q = toTsQuery(message);
  const { data: found } = q ? await supabase.rpc("search_knowledge", { q, lim: 4 }) : { data: [] as any[] };
  const seen = new Set<string>();
  const sources = ((found ?? []) as any[])
    .filter((r) => (seen.has(r.title) ? false : (seen.add(r.title), true)))
    .slice(0, 4)
    .map((r) => ({ title: r.title as string, url: (r.url as string | null) ?? null, updated_on: r.updated_on as string, official: !!r.is_official, snippet: r.snippet as string }));
  const suggestions = INTENTS.filter((i) => i.re.test(message)).slice(0, 2).map(({ label, href }) => ({ label, href }));
  const publicSources = sources.map(({ snippet: _s, ...rest }) => rest);

  let reply: string;
  let notice: string | undefined;
  if (!llmConfigured()) {
    notice = "El asistente de IA no está configurado en este entorno. Te muestro los recursos relacionados encontrados en la base de conocimientos.";
    reply = sources.length
      ? "Encontré estos recursos que pueden ayudarte. Ábrelos o revisa las pantallas sugeridas:\n" + sources.map((s) => `• ${s.title}`).join("\n")
      : "No encontré información verificada sobre eso en la base de conocimientos. Te sugiero consultar las fuentes oficiales (SUNAT, MTPE, gob.pe o la municipalidad).";
  } else {
    const contexto = sources.length
      ? sources.map((s, i) => `[${i + 1}] ${s.title} (actualizado ${s.updated_on}${s.official ? ", fuente oficial" : ""}${s.url ? `, ${s.url}` : ""})\n${s.snippet}`).join("\n\n")
      : "(sin resultados en la base de conocimientos)";
    try {
      reply = await llmComplete({
        system: CHAT_SYSTEM,
        messages: [...history, { role: "user", content: `<contexto>\n${contexto}\n</contexto>\n\nPregunta del usuario: ${message}` }],
        maxTokens: 500,
      });
      if (!reply) throw new Error("empty");
    } catch (e) {
      logError("chat.llm", e);
      return NextResponse.json({ error: "El asistente no pudo responder en este momento. Inténtalo de nuevo en unos minutos." }, { status: 502 });
    }
  }

  let convId = conversation_id;
  if (user) {
    try {
      if (!convId) {
        const { data: c } = await supabase.from("chat_conversations").insert({ user_id: user.id, context: parsed.data.page ?? null }).select("id").single();
        convId = c?.id;
      }
      if (convId) {
        await supabase.from("chat_messages").insert([
          { conversation_id: convId, role: "user", content: message },
          { conversation_id: convId, role: "assistant", content: reply, sources: publicSources },
        ]);
      }
    } catch (e) { logError("chat.persist", e); }
  }

  return NextResponse.json({ reply, sources: publicSources, suggestions, ai: llmConfigured(), notice, conversation_id: convId });
}
