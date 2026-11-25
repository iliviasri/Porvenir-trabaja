# Arquitectura

## Capas
- **UI** (`src/app`, `src/components`): Server Components por defecto; formularios cliente con React Hook Form + Zod. Mobile-first, enlaces de salto, etiquetas y roles ARIA.
- **Servidor**: Server Actions (`src/actions`) para mutaciones y Route Handlers (`src/app/api`) para IA, archivos, CSV y exportación de datos. Cada acción llama `authorize(rol)` y valida con Zod (`src/lib/validators.ts`).
- **Base de datos** (`supabase/migrations`): Postgres con RLS en todas las tablas, funciones `SECURITY DEFINER` para evitar recursión de políticas, triggers de protección de columnas (estado de negocio, activación de ofertas, `is_demo`), historial de estados y vista `candidate_cards` (sin datos de contacto).
- **Almacenamiento**: buckets privados `worker-cvs` y `business-docs`; acceso solo mediante `/api/files/[kind]/[id]`, que autoriza con RLS y emite URL firmada de corta vida.

## Lógica determinista
- `src/lib/matching.ts`: puntaje 0–100 con pesos (habilidades 40, experiencia 25, disponibilidad 15, ubicación/modalidad 10, preferencias 10) guardados en `matching_config`. Devuelve motivos y faltantes. No usa atributos sensibles. Es informativo.
- `src/lib/formalization.ts`: motor de reglas JSON (`all`/`any`; `eq/neq/in/gte/lte/truthy`) sobre el catálogo versionado `formalization_requirements`. Editar un requisito crea una versión nueva.
- `src/lib/offer-safety.ts`: bloquea cobros al postulante, datos sensibles, discriminación explícita y prácticas sin condiciones claras; emite advertencias.

## IA (opcional)
`src/lib/ai/*`. Proveedor configurable por entorno (`anthropic` u `openai-compatible`). Usos: redactar la explicación de la ruta, extraer datos del relato del CV, chatbot con recuperación (`search_knowledge`, FTS en español) y citas de fuentes con fecha. Sin API key: `llmConfigured()` es falso y la UI lo indica. El chatbot no ejecuta acciones sin confirmación y tiene límite de uso (`check_rate_limit`, falla cerrado).

## Seguridad y privacidad
RLS; roles en `user_roles`; middleware de rutas; CSP y cabeceras (`next.config.mjs`); validación de subidas (tamaño, MIME, firma mágica, PDF sin contenido activo); exportación CSV con protección frente a inyección de fórmulas; auditoría en `audit_logs`; consentimiento versionado; solicitudes ARCO y exportación JSON; datos de trabajadores anonimizados en CSV.

## Entidades extra (justificadas)
`skills`, `job_categories`, `business_contacts` (contacto público opcional separado), `matching_config`, `rate_limits`, `privacy_requests`, historiales de estado y banderas `is_demo`/`is_active`.
