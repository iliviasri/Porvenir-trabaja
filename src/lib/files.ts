/** Validación de archivos subidos: tipo, tamaño, firma real (magic bytes) y contenido activo en PDF. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB (límite de Vercel para el cuerpo de la función: 4,5 MB)

export type UploadKind = "cv" | "business-doc";

const ALLOWED: Record<UploadKind, Record<string, string[]>> = {
  cv: { "application/pdf": ["pdf"] },
  "business-doc": { "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"] },
};

function startsWith(buf: Uint8Array, sig: number[]) {
  return sig.every((b, i) => buf[i] === b);
}

export function detectMime(buf: Uint8Array): string | null {
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  return null;
}

const ACTIVE_PDF = [/\/JavaScript/i, /\/JS\s/i, /\/Launch/i, /\/EmbeddedFile/i, /\/OpenAction/i, /\/AA\s*</i];

export function sanitizeFileName(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "");
  return base.slice(-80) || "archivo";
}

export function validateUpload(
  kind: UploadKind,
  file: { name: string; type: string; size: number },
  bytes: Uint8Array,
): { ok: true; mime: string; ext: string } | { ok: false; error: string } {
  if (file.size <= 0) return { ok: false, error: "El archivo está vacío." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "El archivo supera el máximo de 4 MB." };
  const allowed = ALLOWED[kind];
  const real = detectMime(bytes);
  if (!real || !allowed[real]) {
    return { ok: false, error: kind === "cv" ? "Solo se permite un CV en formato PDF." : "Solo se permiten archivos PDF, JPG o PNG." };
  }
  if (file.type && file.type !== real) return { ok: false, error: "El tipo de archivo no coincide con su contenido." };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed[real]!.includes(ext)) return { ok: false, error: "La extensión del archivo no coincide con su tipo." };
  if (real === "application/pdf") {
    const sample = new TextDecoder("latin1").decode(bytes);
    if (ACTIVE_PDF.some((re) => re.test(sample))) {
      return { ok: false, error: "El PDF contiene contenido activo (scripts o adjuntos) y no puede subirse." };
    }
  }
  return { ok: true, mime: real, ext: allowed[real]![0]! };
}
