import { z } from "zod";
import { AVAILABILITIES, MODALITIES, OFFER_TYPES, PREMISES, RUC_DECLARED, SCHEDULES, APPLICATION_STATUSES, TASK_STATUSES } from "@/lib/constants";

const phone = z.string().trim().regex(/^(9\d{8})?$/, "Ingresa un celular de 9 dígitos que empiece con 9");
const money = z.string().trim().regex(/^(\d{1,6}(\.\d{1,2})?)?$/, "Ingresa un monto válido (solo números)");
const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  role: z.enum(["worker", "business"], { message: "Elige cómo quieres usar la plataforma" }),
  full_name: z.string().trim().min(3, "Escribe tu nombre completo").max(120),
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
  phone,
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Za-z]/, "Incluye al menos una letra")
    .regex(/\d/, "Incluye al menos un número"),
  accepted_privacy: z.boolean().refine((v) => v === true, "Debes aceptar la política de privacidad para continuar"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const workerProfileSchema = z
  .object({
    full_name: z.string().trim().min(3, "Escribe tu nombre completo").max(120),
    phone,
    headline: text(120),
    bio: text(1500),
    main_sector_id: z.string(),
    availability: z.enum(AVAILABILITIES),
    schedule_pref: z.array(z.enum(SCHEDULES)),
    modality_pref: z.array(z.enum(MODALITIES)).min(1, "Elige al menos una modalidad"),
    expected_salary_min: money,
    expected_salary_max: money,
    years_experience: z.string().trim().regex(/^\d{1,2}(\.\d)?$/, "Ingresa los años de experiencia (ej. 2 o 1.5)"),
    travel_ok: z.boolean(),
    visible_to_employers: z.boolean(),
    skills: text(1200),
  })
  .refine((v) => !v.expected_salary_min || !v.expected_salary_max || Number(v.expected_salary_max) >= Number(v.expected_salary_min), {
    path: ["expected_salary_max"],
    message: "El máximo no puede ser menor que el mínimo",
  });
export type WorkerProfileInput = z.infer<typeof workerProfileSchema>;

export const experienceSchema = z.object({
  role_title: z.string().trim().min(2, "Escribe el cargo o tarea").max(120),
  company: text(120),
  sector_id: z.string(),
  years: z.string().trim().regex(/^\d{0,2}$/, "Años: solo números"),
  months: z.string().trim().regex(/^(\d|1[01])?$/, "Meses: de 0 a 11"),
  description: text(800),
});
export type ExperienceInput = z.infer<typeof experienceSchema>;

export const businessSchema = z.object({
  trade_name: z.string().trim().min(2, "Escribe el nombre comercial").max(120),
  legal_name: text(160),
  ruc: z.string().trim().regex(/^((10|15|16|17|20)\d{9})?$/, "El RUC tiene 11 dígitos y empieza con 10, 15, 16, 17 o 20"),
  ruc_declared: z.enum(RUC_DECLARED),
  sector_id: z.string(),
  activity_description: z.string().trim().min(10, "Cuéntanos brevemente a qué se dedica tu negocio").max(1000),
  description: text(1500),
  products_services: text(1000),
  premises: z.enum(PREMISES),
  workers_count: z.number({ message: "Ingresa un número" }).int("Debe ser un número entero").min(0).max(10000),
  address: z.string().trim().min(3, "Escribe la dirección en El Porvenir").max(200),
  is_public: z.boolean(),
  contact_phone: phone,
  contact_whatsapp: phone,
  contact_email: z.string().trim().max(160).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Correo inválido"),
  contact_website: text(200),
  show_contact: z.boolean(),
});
export type BusinessInput = z.infer<typeof businessSchema>;

export const jobSchema = z
  .object({
    title: z.string().trim().min(5, "El cargo debe tener al menos 5 caracteres").max(120),
    description: z.string().trim().min(40, "Describe el puesto con al menos 40 caracteres").max(5000),
    category_id: z.string().min(1, "Elige un sector"),
    offer_type: z.enum(OFFER_TYPES),
    skills: text(1200),
    salary_min: money,
    salary_max: money,
    schedule_type: z.enum(SCHEDULES),
    schedule_text: text(200),
    modality: z.enum(MODALITIES),
    experience_min_years: z.string().trim().regex(/^\d{1,2}(\.\d)?$/, "Ingresa los años (0 si no se exige)"),
    vacancies: z.number({ message: "Ingresa un número" }).int().min(1, "Mínimo 1").max(500),
    address: z.string().trim().min(3, "Escribe la dirección en El Porvenir").max(200),
    closes_at: z.string().trim(),
    submit_for_review: z.boolean(),
  })
  .refine((v) => !v.salary_min || !v.salary_max || Number(v.salary_max) >= Number(v.salary_min), {
    path: ["salary_max"],
    message: "El máximo no puede ser menor que el mínimo",
  });
export type JobInput = z.infer<typeof jobSchema>;

export const applySchema = z.object({
  job_id: z.string().uuid(),
  cover_note: text(1000).optional(),
  consent: z.literal(true, { message: "Debes autorizar compartir tu perfil con la empresa" }),
});

export const applicationStatusSchema = z.object({
  application_id: z.string().uuid(),
  status: z.enum(APPLICATION_STATUSES),
});

export const taskUpdateSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(TASK_STATUSES),
  note: text(500).optional(),
  due_date: z.string().optional(),
});

export const diagnosticAnswersSchema = z.object({
  ruc_status: z.enum(RUC_DECLARED),
  premises: z.enum(PREMISES),
  workers_count: z.number({ message: "Ingresa un número" }).int().min(0).max(10000),
  wants_hire: z.boolean(),
  sells_to_businesses: z.boolean(),
  has_municipal_license: z.enum(["si", "no", "no_sabe"]),
});
export type DiagnosticAnswers = z.infer<typeof diagnosticAnswersSchema>;

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "Escribe tu consulta").max(1000, "Máximo 1000 caracteres"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(8)
    .default([]),
  page: z.string().max(200).optional(),
  conversation_id: z.string().uuid().optional(),
});

export const formalizaRequestSchema = z.object({
  free_text: z.string().trim().min(10, "Cuéntanos un poco más sobre tu negocio").max(3000),
});

export const cvExtractRequestSchema = z.object({
  text: z.string().trim().min(10, "Escribe o graba al menos una frase sobre tu experiencia").max(6000),
});

export const cvDataSchema = z.object({
  headline: z.string().trim().max(120),
  summary: z.string().trim().max(1500),
  skills: z.array(z.string().trim().min(2).max(60)).max(25),
  experiences: z
    .array(
      z.object({
        role_title: z.string().trim().min(2).max(120),
        company: z.string().trim().max(120).default(""),
        months: z.number().int().min(0).max(720),
        description: z.string().trim().max(800).default(""),
      }),
    )
    .max(15),
  confirmed: z.literal(true, { message: "Confirma que revisaste que los datos son verdaderos" }),
});
export type CvData = z.infer<typeof cvDataSchema>;

export const privacyRequestSchema = z.object({
  type: z.enum(["acceso", "rectificacion", "eliminacion", "oposicion"]),
  message: text(1500),
});

export const requirementSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(3).max(60).regex(/^[A-Z0-9_]+$/, "Usa MAYÚSCULAS, números y guion bajo"),
  category: z.enum(["tributaria", "municipal", "laboral", "otra"]),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(3).max(400),
  plain_explanation: z.string().trim().min(10).max(2000),
  documents: z.string().max(1500),
  applies_when: z.string().max(2000),
  caveats: z.string().max(600),
  source_label: z.string().trim().min(2).max(200),
  source_url: z.string().trim().max(300).refine((v) => v === "" || /^https:\/\//.test(v), "La URL debe comenzar con https://"),
  sort_order: z.number().int().min(0).max(9999),
  active: z.boolean(),
});

export const knowledgeSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(10).max(8000),
  category: z.enum(["plataforma", "empleo", "formalizacion", "laboral", "privacidad", "otro"]),
  url: z.string().trim().max(300).refine((v) => v === "" || /^https:\/\//.test(v), "La URL debe comenzar con https://"),
  is_official: z.boolean(),
  active: z.boolean(),
});

/** Primer mensaje de error de un ZodError (para mostrar al usuario). */
export function firstIssue(err: z.ZodError) {
  return err.issues[0]?.message ?? "Datos inválidos";
}

export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".");
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export const toNum = (v: string | undefined | null) => (v && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
