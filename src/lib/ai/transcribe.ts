import "server-only";

export function transcribeConfigured() {
  return Boolean(process.env.TRANSCRIBE_API_KEY && process.env.TRANSCRIBE_BASE_URL);
}

/** Transcripción de audio mediante un servicio configurable compatible con POST {BASE}/audio/transcriptions. */
export async function transcribeAudio(file: File): Promise<string> {
  if (!transcribeConfigured()) throw new Error("not_configured");
  const form = new FormData();
  form.append("file", file, file.name || "audio.webm");
  form.append("model", process.env.TRANSCRIBE_MODEL ?? "whisper-1");
  form.append("language", "es");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);
  try {
    const res = await fetch(`${process.env.TRANSCRIBE_BASE_URL!.replace(/\/$/, "")}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.TRANSCRIBE_API_KEY}` },
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`transcribe ${res.status}`);
    const json = (await res.json()) as { text?: string };
    return (json.text ?? "").trim();
  } finally {
    clearTimeout(timer);
  }
}
