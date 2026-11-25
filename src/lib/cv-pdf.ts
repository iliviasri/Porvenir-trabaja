import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface CvPdfInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  headline: string;
  summary: string;
  skills: string[];
  experiences: { role_title: string; company?: string; months: number; description?: string }[];
  availability?: string;
}

const MAP: Record<string, string> = { "—": "-", "–": "-", "“": '"', "”": '"', "‘": "'", "’": "'", "•": "-", "…": "...", " ": " " };
/** Los fuentes estándar del PDF solo admiten WinAnsi: sustituimos lo que no se pueda codificar. */
const safe = (s: string) =>
  Array.from(s ?? "").map((c) => MAP[c] ?? (c.charCodeAt(0) <= 255 && (c.charCodeAt(0) >= 32 || c === "\n") ? c : c === "\n" ? "\n" : "?")).join("");

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of safe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export function durationLabel(months: number) {
  if (!months) return "";
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} ${y === 1 ? "año" : "años"}` : "", m ? `${m} ${m === 1 ? "mes" : "meses"}` : ""].filter(Boolean).join(" y ");
}

export async function buildCvPdf(cv: CvPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 48;
  const teal = rgb(0.06, 0.37, 0.43);
  const amber = rgb(0.93, 0.55, 0.1);
  const dark = rgb(0.1, 0.13, 0.16);
  const grey = rgb(0.38, 0.42, 0.46);

  let page = pdf.addPage([W, H]);
  let y = H;

  const header = () => {
    page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: teal });
    page.drawRectangle({ x: 0, y: H - 114, width: W, height: 4, color: amber });
    page.drawText(safe(cv.name || "Sin nombre"), { x: M, y: H - 55, size: 26, font: bold, color: rgb(1, 1, 1) });
    if (cv.headline) page.drawText(safe(cv.headline), { x: M, y: H - 80, size: 13, font: regular, color: rgb(0.88, 0.96, 0.97) });
    const contact = [cv.phone && `Cel. ${cv.phone}`, cv.email, "El Porvenir, Trujillo"].filter(Boolean).join("   |   ");
    page.drawText(safe(contact), { x: M, y: H - 100, size: 9.5, font: regular, color: rgb(0.88, 0.96, 0.97) });
    y = H - 114 - 30;
  };
  header();

  const ensure = (need: number) => {
    if (y - need < 60) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };
  const section = (title: string) => {
    ensure(40);
    page.drawText(safe(title.toUpperCase()), { x: M, y, size: 11, font: bold, color: teal });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: amber });
    y -= 16;
  };
  const paragraph = (text: string, size = 10.5, font = regular, color = dark, indent = 0) => {
    for (const line of wrap(text, font, size, W - 2 * M - indent)) {
      ensure(size + 6);
      page.drawText(line, { x: M + indent, y, size, font, color });
      y -= size + 4;
    }
  };

  if (cv.summary) {
    section("Perfil");
    paragraph(cv.summary);
    y -= 10;
  }
  if (cv.skills.length) {
    section("Habilidades");
    paragraph(cv.skills.join("  •  ").replace(/•/g, "-"));
    y -= 10;
  }
  if (cv.experiences.length) {
    section("Experiencia");
    for (const e of cv.experiences) {
      ensure(48);
      paragraph(e.role_title, 11.5, bold);
      const meta = [e.company, durationLabel(e.months)].filter(Boolean).join("  |  ");
      if (meta) paragraph(meta, 9.5, regular, grey);
      if (e.description) paragraph(e.description, 10.5, regular, dark, 0);
      y -= 8;
    }
  }
  if (cv.availability) {
    section("Disponibilidad");
    paragraph(cv.availability);
  }

  for (const p of pdf.getPages()) {
    p.drawText("CV generado con PORVENIR TRABAJA. La información fue revisada y confirmada por la persona postulante.", {
      x: M, y: 28, size: 7.5, font: regular, color: grey,
    });
  }
  pdf.setTitle(`CV - ${safe(cv.name)}`);
  pdf.setProducer("PORVENIR TRABAJA");
  return pdf.save();
}
