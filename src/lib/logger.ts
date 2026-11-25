/** Registro estructurado (JSON) que Vercel indexa en los Runtime Logs. Nunca registrar contraseñas, claves ni contenido sensible. */
type Level = "info" | "warn" | "error";

export function log(level: Level, event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logError = (event: string, err: unknown, data: Record<string, unknown> = {}) =>
  log("error", event, { ...data, error: err instanceof Error ? err.message : String(err) });
