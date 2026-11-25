# PORVENIR TRABAJA

Plataforma de **intermediación laboral y formalización de negocios** exclusiva para **El Porvenir (Trujillo, La Libertad, Perú)**.

Next.js 15 (App Router, TypeScript) · Tailwind + componentes estilo shadcn/ui · Supabase (Postgres, Auth, Storage, RLS) · Zod + React Hook Form · IA por API (opcional, configurable) · listo para Vercel.

## Módulos
| Módulo | Dónde |
|---|---|
| Bolsa de empleo (publicar, buscar, filtrar, favoritos, postular sin duplicados, historial y estados, prácticas vs empleo dependiente, bloqueo de ofertas engañosas, moderación) | `/empleos`, `/trabajador/*`, `/empresa/ofertas`, `/admin/ofertas` |
| IA FORMALIZA (reglas deterministas + catálogo versionado; la IA solo explica y personaliza) | `/formaliza`, `/empresa/diagnostico`, `/empresa/ruta` |
| Panel de seguimiento del negocio (estados + documentos + revisión interna) | `/empresa/*`, `/admin/verificaciones` |
| MATCH LABORAL IA (determinista, explicable, pesos configurables, sin atributos sensibles) | `/trabajador/recomendados`, `/empresa/candidatos`, `/empresa/recomendaciones`, `/admin/categorias` |
| CV INTELIGENTE (voz/texto → extracción → edición → confirmación → PDF) | `/trabajador/cv` |
| Servicios laborales / CUL | `/servicios`, `/trabajador/servicios` |
| Chatbot flotante con base de conocimiento administrable y fuentes | widget global, `/admin/requisitos` |
| Directorio de negocios | `/empresas` |
| Observatorio / estadísticas reales, CSV, auditoría | `/admin`, `/admin/auditoria` |
| Privacidad y derechos ARCO (Ley 29733) | `/privacidad`, `/cuenta/privacidad` |

## Puesta en marcha local
```bash
npm install
cp .env.example .env.local        # completa las variables
# 1. Crea un proyecto en Supabase y ejecuta en el SQL Editor, en orden:
#    supabase/migrations/0001_schema.sql, 0002_rls.sql, 0003_seed_catalogs.sql
npm run dev
```
Datos ficticios opcionales (marcados `is_demo = true`):
```bash
node --env-file=.env.local scripts/seed-demo.mjs
```
Primer administrador: regístrate normalmente y, en el SQL Editor, ejecuta
`insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = 'tu@correo';`

## Verificación
```bash
npm run typecheck   # TypeScript
npm test            # 40 pruebas (matching, reglas de formalización, seguridad de ofertas)
npm run test:db     # migraciones + RLS en Postgres embebido (PGlite), 38 aserciones
npm run build       # requiere variables NEXT_PUBLIC_SUPABASE_* (pueden ser ficticias)
```
Documentación detallada: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md), [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md), [`docs/REQUISITOS.md`](docs/REQUISITOS.md).

## Principios de diseño
- La **IA nunca decide**: obligaciones legales salen del catálogo versionado; el match es una fórmula auditable; el CV nunca inventa credenciales. Sin clave de API, las funciones de IA se muestran como no disponibles (no se simulan).
- **Verificación interna ≠ autorización oficial**: la plataforma no reemplaza a SUNAT ni a la municipalidad, y la interfaz lo dice.
- **Seguridad en capas**: UI + servidor (Server Actions con `authorize`) + base de datos (RLS). Archivos en buckets privados con URL firmadas; validación de subidas; límites de uso; auditoría.
