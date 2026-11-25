import { describe, it, expect } from "vitest";
import { checkOfferContent } from "@/lib/offer-safety";
import { validateUpload, detectMime, sanitizeFileName, MAX_UPLOAD_BYTES } from "@/lib/files";
import { extractKeywords, detectMonths } from "@/lib/cv-keywords";
import { parseSkillList, safeSearchTerm, slugify, formatSalary } from "@/lib/utils";
import { registerSchema, jobSchema, businessSchema, applySchema, cvDataSchema } from "@/lib/validators";
import { homePathFor } from "@/lib/auth-paths";
import { CUL_URL } from "@/lib/constants";

const enc = (s: string) => new TextEncoder().encode(s);
const pdfBytes = (extra = "") => enc(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}\n%%EOF`);

describe("ofertas engañosas", () => {
  const base = { title: "Aparador", description: "Se busca aparador con experiencia en taller de calzado.", offer_type: "empleo_dependiente" };
  it("acepta una oferta normal", () => {
    const r = checkOfferContent(base);
    expect(r.blocked).toHaveLength(0);
  });
  it("bloquea pagos al postulante", () => {
    expect(checkOfferContent({ ...base, description: "Debes pagar una inscripción de S/ 50 para empezar." }).blocked.length).toBeGreaterThan(0);
    expect(checkOfferContent({ ...base, description: "Cobramos depósito de garantía antes del ingreso." }).blocked.length).toBeGreaterThan(0);
  });
  it("bloquea 'sin contrato' en empleo dependiente pero solo advierte en otros tipos", () => {
    expect(checkOfferContent({ ...base, description: "Trabajo sin contrato, pago diario en efectivo." }).blocked.length).toBeGreaterThan(0);
    expect(checkOfferContent({ ...base, offer_type: "otro", description: "Trabajo sin contrato, pago diario en efectivo." }).blocked).toHaveLength(0);
  });
  it("bloquea criterios discriminatorios y datos sensibles", () => {
    expect(checkOfferContent({ ...base, description: "Solo mujeres, buena presencia, menor de 25 años." }).blocked.length).toBeGreaterThan(0);
    expect(checkOfferContent({ ...base, description: "Envíanos tu clave SOL y foto de tu DNI." }).blocked.length).toBeGreaterThan(0);
  });
  it("bloquea promesas de ganancias garantizadas", () => {
    expect(checkOfferContent({ ...base, description: "Ganancias garantizadas, dinero fácil desde casa." }).blocked.length).toBeGreaterThan(0);
  });
  it("advierte comisión única", () => {
    expect(checkOfferContent({ ...base, description: "Pago únicamente comisiones por venta, sin sueldo fijo." }).warnings.length).toBeGreaterThan(0);
  });
});

describe("subida de archivos", () => {
  it("acepta un PDF válido como CV", () => {
    const b = pdfBytes();
    expect(validateUpload("cv", { name: "cv.pdf", type: "application/pdf", size: b.length }, b).ok).toBe(true);
  });
  it("rechaza un ejecutable renombrado como PDF", () => {
    const b = enc("MZ\u0090\u0000 this is an exe");
    const r = validateUpload("cv", { name: "virus.pdf", type: "application/pdf", size: b.length }, b);
    expect(r.ok).toBe(false);
  });
  it("rechaza PDF con JavaScript", () => {
    const b = pdfBytes("<< /S /JavaScript /JS (app.alert(1)) >>");
    expect(validateUpload("cv", { name: "a.pdf", type: "application/pdf", size: b.length }, b).ok).toBe(false);
  });
  it("rechaza mime que no coincide y extensiones falsas", () => {
    const b = pdfBytes();
    expect(validateUpload("cv", { name: "a.pdf", type: "image/png", size: b.length }, b).ok).toBe(false);
    expect(validateUpload("cv", { name: "a.exe", type: "application/pdf", size: b.length }, b).ok).toBe(false);
  });
  it("respeta el tamaño máximo y los tipos por categoría", () => {
    expect(validateUpload("cv", { name: "a.pdf", type: "application/pdf", size: MAX_UPLOAD_BYTES + 1 }, pdfBytes()).ok).toBe(false);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(detectMime(png)).toBe("image/png");
    expect(validateUpload("cv", { name: "a.png", type: "image/png", size: 10 }, png).ok).toBe(false);
    expect(validateUpload("business-doc", { name: "a.png", type: "image/png", size: 10 }, png).ok).toBe(true);
  });
  it("sanea nombres de archivo", () => {
    expect(sanitizeFileName("../../Mi Constancia ñandú.pdf")).toMatch(/^[a-zA-Z0-9._-]+$/);
  });
});

describe("CV: extracción por palabras clave (sin IA)", () => {
  it("detecta habilidades y duración del ejemplo del producto", () => {
    const t = "He trabajado tres años pegando suelas, cortando cuero y armando zapatos";
    const r = extractKeywords(t);
    expect(r.skills).toEqual(expect.arrayContaining(["Pegado de suelas", "Corte de cuero", "Armado de calzado"]));
    expect(r.months).toBe(36);
  });
  it("no inventa habilidades", () => {
    expect(extractKeywords("Me gusta jugar fútbol").skills).toHaveLength(0);
  });
  it("detecta meses y años", () => {
    expect(detectMonths("trabajé 6 meses y luego 2 años")).toBe(24);
  });
});

describe("utilidades y validaciones", () => {
  it("parsea listas de habilidades sin duplicados", () => {
    expect(parseSkillList("Corte de cuero, corte de cuero; Ventas\n  ,x")).toEqual(["Corte de cuero", "Ventas"]);
    expect(slugify("Atención al Cliente")).toBe("atencion-al-cliente");
  });
  it("limpia términos de búsqueda para filtros PostgREST", () => {
    expect(safeSearchTerm("zapato,(or) %x*")).not.toMatch(/[,()%*]/);
  });
  it("formatea salarios", () => {
    expect(formatSalary(1200, 1500)).toContain("1");
    expect(formatSalary(null, null)).toBe("A convenir");
  });
  it("registro exige consentimiento y contraseña segura", () => {
    const ok = { role: "worker", full_name: "Ana Perez", email: "ANA@MAIL.COM", phone: "987654321", password: "clave1234", accepted_privacy: true };
    expect(registerSchema.safeParse(ok).success).toBe(true);
    expect(registerSchema.parse(ok).email).toBe("ana@mail.com");
    expect(registerSchema.safeParse({ ...ok, accepted_privacy: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, password: "sololetras" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, role: "admin" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, phone: "12345" }).success).toBe(false);
  });
  it("valida ofertas y rangos salariales", () => {
    const job = { title: "Aparador de calzado", description: "x".repeat(50), category_id: "c", offer_type: "empleo_dependiente", skills: "", salary_min: "1500", salary_max: "1000", schedule_type: "tiempo_completo", schedule_text: "", modality: "presencial", experience_min_years: "1", vacancies: 1, address: "Av. Principal 1", closes_at: "", submit_for_review: true };
    expect(jobSchema.safeParse(job).success).toBe(false);
    expect(jobSchema.safeParse({ ...job, salary_max: "2000" }).success).toBe(true);
  });
  it("valida RUC peruano", () => {
    const biz = { trade_name: "Calzados X", legal_name: "", ruc: "20123456789", ruc_declared: "tiene", sector_id: "", activity_description: "Fabricación de calzado", description: "", products_services: "", premises: "taller", workers_count: 2, address: "Jr. Lima 1", is_public: true, contact_phone: "", contact_whatsapp: "", contact_email: "", contact_website: "", show_contact: false };
    expect(businessSchema.safeParse(biz).success).toBe(true);
    expect(businessSchema.safeParse({ ...biz, ruc: "30123456789" }).success).toBe(false);
  });
  it("postular exige autorización de compartir perfil", () => {
    expect(applySchema.safeParse({ job_id: crypto.randomUUID(), consent: false }).success).toBe(false);
  });
  it("el CV requiere confirmación explícita de la persona", () => {
    const cv = { headline: "Armador", summary: "", skills: ["Ventas"], experiences: [], confirmed: false };
    expect(cvDataSchema.safeParse(cv).success).toBe(false);
    expect(cvDataSchema.safeParse({ ...cv, confirmed: true }).success).toBe(true);
  });
});

describe("permisos y enlaces oficiales", () => {
  it("cada rol aterriza en su panel", () => {
    expect(homePathFor(["worker"])).toBe("/trabajador");
    expect(homePathFor(["business"])).toBe("/empresa");
    expect(homePathFor(["worker", "admin"])).toBe("/admin");
  });
  it("el CUL apunta exclusivamente a la dirección oficial indicada", () => {
    expect(CUL_URL).toBe("https://www.gob.pe/47089-obtener-tu-certificado-unico-laboral-cul");
  });
});
