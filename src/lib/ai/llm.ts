import "server-only";

/**
 * Cliente de modelo de lenguaje (solo servidor). La clave nunca llega al navegador.
 * Proveedores: "anthropic" (Messages API) u "openai-compatible" (/chat/completions).
 */
export class LLMUnavailableError extends Error {
  constructor() {
    super("El asistente de IA no está configurado en este entorno.");
  }
}

export function llmConfigured() {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_MODEL);
}

export interface LLMMessage { role: "user" | "assistant"; content: string }

export async function llmComplete(opts: { system: string; messages: LLMMessage[]; maxTokens?: number; temperature?: number; timeoutMs?: number }): Promise<string> {
  if (!llmConfigured()) throw new LLMUnavailableError();
  const provider = process.env.LLM_PROVIDER ?? "anthropic";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25_000);
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": process.env.LLM_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: process.env.LLM_MODEL,
          max_tokens: opts.maxTokens ?? 800,
          temperature: opts.temperature ?? 0.2,
          system: opts.system,
          messages: opts.messages,
        }),
      });
      if (!res.ok) throw new Error(`LLM ${res.status}`);
      const json = (await res.json()) as { content?: { type: string; text?: string }[] };
      return (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    }
    const base = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        max_tokens: opts.maxTokens ?? 800,
        temperature: opts.temperature ?? 0.2,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error("DETALLE ERROR LLM:", res.status, `${base}/chat/completions`, process.env.LLM_MODEL, errBody);
      throw new Error(`LLM ${res.status}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return (json.choices?.[0]?.message?.content ?? "").trim();
  } finally {
    clearTimeout(timer);
  }
}


/** Extrae el primer objeto JSON de una respuesta (tolera texto o bloques ``` alrededor). */
export function extractJson<T = unknown>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
