import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date(d));
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(d));
}

export function formatSalary(min?: number | string | null, max?: number | string | null) {
  const a = min != null && min !== "" ? Number(min) : null;
  const b = max != null && max !== "" ? Number(max) : null;
  const f = (n: number) => `S/ ${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`;
  if (a && b) return a === b ? f(a) : `${f(a)} – ${f(b)}`;
  if (a) return `Desde ${f(a)}`;
  if (b) return `Hasta ${f(b)}`;
  return "A convenir";
}

/** Normaliza un nombre de habilidad a slug (sin tildes, minúsculas). */
export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Convierte "a, b; c" en una lista única de nombres de habilidades válidos. */
export function parseSkillList(input: string | null | undefined, max = 25): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,;\n]/)) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 60) continue;
    const slug = slugify(name);
    if (!slug || slug.length < 2 || seen.has(slug)) continue;
    seen.add(slug);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

/** Escapa caracteres especiales de filtros PostgREST (.or / .ilike). */
export function safeSearchTerm(q: string) {
  return q.replace(/[%,()*\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
