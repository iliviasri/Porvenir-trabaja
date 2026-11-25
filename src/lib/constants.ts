export const APP_NAME = "PORVENIR TRABAJA";
export const DISTRICT = "El Porvenir";
export const CONSENT_VERSION = "2026-11";

/** Enlace oficial del Certificado Único Laboral. No se simula el trámite. */
export const CUL_URL = "https://www.gob.pe/47089-obtener-tu-certificado-unico-laboral-cul";

export const APPLICATION_STATUSES = ["enviada", "en_revision", "preseleccionada", "entrevista", "seleccionada", "descartada"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const BUSINESS_STATUSES = [
  "registrado", "en_orientacion", "en_proceso_formalizacion", "documentacion_en_revision", "documentacion_verificada", "suspendido",
] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const JOB_STATUSES = ["borrador", "pendiente_moderacion", "activa", "cerrada", "suspendida", "rechazada"] as const;
export const OFFER_TYPES = ["empleo_dependiente", "practicas_preprofesionales", "practicas_profesionales", "otro"] as const;
export const MODALITIES = ["presencial", "hibrido", "remoto"] as const;
export const SCHEDULES = ["tiempo_completo", "medio_tiempo", "turnos", "fines_semana", "por_horas"] as const;
export const AVAILABILITIES = ["inmediata", "una_semana", "un_mes", "no_disponible"] as const;
export const PREMISES = ["local_fijo", "taller", "domicilio", "ambulante", "online", "otro"] as const;
export const RUC_DECLARED = ["no_tiene", "en_tramite", "tiene", "no_sabe"] as const;
export const TASK_STATUSES = ["pendiente", "en_proceso", "completado", "no_aplica"] as const;
export const DOC_STATUSES = ["pendiente", "presentado", "aprobado", "observado"] as const;

export const LABELS: Record<string, string> = {
  // postulaciones
  enviada: "Enviada", en_revision: "En revisión", preseleccionada: "Preseleccionada",
  entrevista: "Entrevista", seleccionada: "Seleccionada", descartada: "Descartada",
  // negocio
  registrado: "Registrado", en_orientacion: "En orientación", en_proceso_formalizacion: "En proceso de formalización",
  documentacion_en_revision: "Documentación en revisión", documentacion_verificada: "Documentación verificada", suspendido: "Suspendido",
  // oferta
  borrador: "Borrador", pendiente_moderacion: "Pendiente de moderación", activa: "Activa", cerrada: "Cerrada",
  suspendida: "Suspendida", rechazada: "Rechazada",
  empleo_dependiente: "Empleo dependiente", practicas_preprofesionales: "Prácticas preprofesionales",
  practicas_profesionales: "Prácticas profesionales", otro: "Otro tipo de oportunidad",
  presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto",
  tiempo_completo: "Tiempo completo", medio_tiempo: "Medio tiempo", turnos: "Por turnos", fines_semana: "Fines de semana", por_horas: "Por horas",
  inmediata: "Inmediata", una_semana: "En una semana", un_mes: "En un mes", no_disponible: "No disponible",
  local_fijo: "Local fijo", taller: "Taller", domicilio: "Desde mi domicilio", ambulante: "Venta ambulante / vía pública", online: "Solo en línea",
  no_tiene: "No tengo RUC", en_tramite: "RUC en trámite", tiene: "Tengo RUC", no_sabe: "No sé",
  pendiente: "Pendiente", en_proceso: "En proceso", completado: "Completado", no_aplica: "No aplica",
  presentado: "Presentado", aprobado: "Aprobado", observado: "Observado",
  tributaria: "Tributaria (SUNAT)", municipal: "Municipal", laboral: "Laboral", otra: "Otra",
  worker: "Trabajador", business: "Empresa / comerciante", admin: "Administrador",
};

export const label = (k: string | null | undefined) => (k ? LABELS[k] ?? k : "—");

export const OFFER_TYPE_NOTICE: Record<string, string> = {
  practicas_preprofesionales: "Las prácticas son una modalidad formativa. No equivalen a un empleo dependiente.",
  practicas_profesionales: "Las prácticas son una modalidad formativa. No equivalen a un empleo dependiente.",
  otro: "Este tipo de oportunidad no es un empleo dependiente. Revisa bien las condiciones.",
};

export const VERIFICATION_DISCLAIMER =
  "«Documentación verificada» es una revisión interna de PORVENIR TRABAJA sobre documentos presentados. No es una licencia, autorización ni certificación emitida por SUNAT, el MTPE o la municipalidad.";

export const INTERNAL_DATA_DISCLAIMER =
  "Estas cifras son registros internos de la plataforma. No constituyen resultados externos verificados (por ejemplo, trámites efectivamente concluidos ante SUNAT o la municipalidad).";
