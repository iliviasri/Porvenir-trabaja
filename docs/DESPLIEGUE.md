# Despliegue (Vercel + Supabase)

## 1. Supabase
1. Crea un proyecto. Región cercana (p. ej. São Paulo).
2. SQL Editor: ejecuta en orden `0001_schema.sql`, `0002_rls.sql`, `0003_seed_catalogs.sql`.
3. Authentication → URL Configuration: *Site URL* = tu dominio; *Redirect URLs* = `https://TU-DOMINIO/auth/callback` (y `http://localhost:3000/auth/callback` para local).
4. Authentication → Providers → Email: confirma correo activado; configura SMTP propio en producción.
5. Storage: los buckets `worker-cvs` y `business-docs` los crea la migración 0002 (privados). Verifica que no sean públicos.
6. Copia URL, anon key y service_role key (Project Settings → API).

## 2. Vercel
1. Importa el repositorio. Framework: Next.js.
2. Variables de entorno (ver `.env.example`): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `NEXT_PUBLIC_PRIVACY_EMAIL`, y opcionalmente `LLM_*`, `TRANSCRIBE_*`.
3. Despliega. `vercel.json` ajusta `maxDuration` de las rutas de IA y la región (`gru1`).
4. Comprueba `GET /api/health`.

## 3. Primer administrador
Regístrate y ejecuta en SQL Editor:
```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'tu@correo';
```

## 4. Antes de publicar (pendientes legales/operativos)
- Revisar con asesoría legal la política de privacidad y los textos de consentimiento (Ley N.º 29733).
- Evaluar inscripción del banco de datos personales ante la autoridad de protección de datos y designar responsable.
- Definir `NEXT_PUBLIC_PRIVACY_EMAIL`.
- Revisar y actualizar el catálogo de requisitos con las fuentes oficiales vigentes (el enlace municipal quedó vacío a propósito hasta confirmar la fuente de la Municipalidad de El Porvenir).
- No ejecutar `seed-demo.mjs` en producción real (o limpiar luego los registros `is_demo`).
- Configurar copias de seguridad y monitoreo de errores.
