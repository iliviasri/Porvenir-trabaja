// Valida las migraciones en un Postgres embebido (PGlite) y prueba las políticas RLS clave.
// Uso: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.on("uncaughtException", (e) => { console.error("\nERROR:", e.message?.slice(0, 400)); process.exit(1); });
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();

// ---- Stubs mínimos del entorno Supabase (auth, storage, roles) ----
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
`);

const files = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  await db.exec(readFileSync(join(root, "supabase/migrations", f), "utf8"));
  console.log("✔ migración aplicada:", f);
}
await db.exec(`
  grant all on all tables in schema public to authenticated, service_role;
  grant select on all tables in schema public to anon;
  grant execute on all functions in schema public to anon, authenticated, service_role;
  revoke execute on function public.check_rate_limit(text,int,int) from anon, authenticated;
  grant select on all tables in schema storage to authenticated;
`);

let failed = 0;
const ok = (name, cond) => { console.log((cond ? "✔" : "✘") + " " + name); if (!cond) failed++; };

async function as(uid, role, sql) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); select set_config('request.jwt.claim.role', '${role}', false); set role ${role};`);
  try { return await db.query(sql); } finally { await db.exec("reset role;"); }
}
async function fails(uid, role, sql) { try { await as(uid, role, sql); return false; } catch { return true; } }

const U = { admin: "00000000-0000-0000-0000-0000000000a1", w1: "00000000-0000-0000-0000-0000000000b1", w2: "00000000-0000-0000-0000-0000000000b2", b1: "00000000-0000-0000-0000-0000000000c1", b2: "00000000-0000-0000-0000-0000000000c2" };
const mk = (id, role, name, extra = "") => `insert into auth.users (id, email, raw_user_meta_data) values ('${id}', '${name}@test.pe', '{"role":"${role}","full_name":"${name} Prueba","accepted_privacy":"true"${extra}}');`;
await db.exec(mk(U.admin, "admin", "admin") + mk(U.w1, "worker", "ana") + mk(U.w2, "worker", "luis") + mk(U.b1, "business", "tallerA") + mk(U.b2, "business", "tallerB"));

const roles = (await db.query(`select user_id, role from public.user_roles`)).rows;
ok("el rol 'admin' pedido por metadatos se degrada a 'worker' (no se puede autoasignar)", roles.find((r) => r.user_id === U.admin)?.role === "worker");
await db.exec(`delete from public.user_roles where user_id='${U.admin}'; insert into public.user_roles values ('${U.admin}','admin');`);
ok("trigger crea worker_profile para trabajadores", (await db.query(`select 1 from public.worker_profiles where user_id='${U.w1}'`)).rows.length === 1);

// Negocios
ok("un trabajador NO puede crear negocios", await fails(U.w1, "authenticated", `insert into public.businesses (owner_id, trade_name) values ('${U.w1}', 'X negocio')`));
const biz = (await as(U.b1, "authenticated", `insert into public.businesses (owner_id, trade_name, premises) values ('${U.b1}', 'Calzados A', 'taller') returning id`)).rows[0].id;
ok("el dueño queda como miembro del negocio (trigger)", (await as(U.b1, "authenticated", `select 1 from public.business_members where business_id='${biz}'`)).rows.length === 1);
ok("negocio de otro distrito es rechazado", await fails(U.b2, "authenticated", `insert into public.businesses (owner_id, trade_name, district) values ('${U.b2}', 'Fuera', 'Víctor Larco')`));
const biz2 = (await as(U.b2, "authenticated", `insert into public.businesses (owner_id, trade_name) values ('${U.b2}', 'Calzados B') returning id`)).rows[0].id;
await as(U.b1, "authenticated", `update public.businesses set status='documentacion_verificada', ruc_verified=true where id='${biz}'`);
const st = (await db.query(`select status, ruc_verified from public.businesses where id='${biz}'`)).rows[0];
ok("la empresa no puede autoverificarse (status/ruc_verified protegidos)", st.status === "registrado" && st.ruc_verified === false);
ok("negocio privado y sin ofertas no es visible para anónimos", (await as(null, "anon", `select 1 from public.businesses where id='${biz}'`)).rows.length === 0);

// Ofertas
const jobSql = (status) => `insert into public.job_offers (business_id, title, description, address, status) values ('${biz}', 'Aparador de calzado', '${"Se busca aparador con experiencia en taller de calzado. ".repeat(2)}', 'Av. Principal 123', '${status}') returning id`;
ok("la empresa no puede publicar una oferta directamente como 'activa'", await fails(U.b1, "authenticated", jobSql("activa")));
ok("empresa B no puede crear ofertas para el negocio de A", await fails(U.b2, "authenticated", jobSql("pendiente_moderacion")));
const job = (await as(U.b1, "authenticated", jobSql("pendiente_moderacion"))).rows[0].id;
ok("oferta pendiente no es visible públicamente", (await as(null, "anon", `select 1 from public.job_offers where id='${job}'`)).rows.length === 0);
await as(U.b1, "authenticated", `update public.job_offers set status='activa' where id='${job}'`);
ok("la empresa no puede activar su propia oferta (trigger la devuelve a moderación)", (await db.query(`select status from public.job_offers where id='${job}'`)).rows[0].status === "pendiente_moderacion");
await as(U.admin, "authenticated", `update public.job_offers set status='activa', published_at=now() where id='${job}'`);
ok("tras aprobar el administrador la oferta es pública", (await as(null, "anon", `select 1 from public.job_offers where id='${job}'`)).rows.length === 1);
ok("el negocio con oferta activa es visible públicamente", (await as(null, "anon", `select 1 from public.businesses where id='${biz}'`)).rows.length === 1);

// Postulaciones
ok("un negocio no puede postular a ofertas", await fails(U.b2, "authenticated", `insert into public.applications (job_id, worker_id) values ('${job}', '${U.b2}')`));
await as(U.w1, "authenticated", `insert into public.applications (job_id, worker_id) values ('${job}', '${U.w1}')`);
ok("postulación duplicada es rechazada", await fails(U.w1, "authenticated", `insert into public.applications (job_id, worker_id) values ('${job}', '${U.w1}')`));
ok("no se puede postular en nombre de otro", await fails(U.w1, "authenticated", `insert into public.applications (job_id, worker_id) values ('${job}', '${U.w2}')`));
ok("historial de estado inicial registrado", (await db.query(`select 1 from public.application_status_history`)).rows.length === 1);
ok("empresa A ve el perfil de la postulante", (await as(U.b1, "authenticated", `select 1 from public.profiles where id='${U.w1}'`)).rows.length === 1);
ok("empresa B NO ve el perfil de la postulante", (await as(U.b2, "authenticated", `select 1 from public.profiles where id='${U.w1}'`)).rows.length === 0);
ok("empresa A NO ve el perfil de quien no postuló", (await as(U.b1, "authenticated", `select 1 from public.profiles where id='${U.w2}'`)).rows.length === 0);
ok("el otro trabajador no ve postulaciones ajenas", (await as(U.w2, "authenticated", `select 1 from public.applications`)).rows.length === 0);
await as(U.b1, "authenticated", `update public.applications set status='preseleccionada' where job_id='${job}'`);
ok("cambio de estado queda en historial", (await db.query(`select 1 from public.application_status_history where new_status='preseleccionada'`)).rows.length === 1);
ok("el trabajador no puede cambiar el estado de su postulación", (await as(U.w1, "authenticated", `update public.applications set status='seleccionada' where job_id='${job}' returning id`)).rows.length === 0);

// Perfil / candidatos
ok("un usuario no puede reactivarse/desactivarse a sí mismo", await (async () => { await as(U.w1, "authenticated", `update public.profiles set is_active=false where id='${U.w1}'`); return (await db.query(`select is_active from public.profiles where id='${U.w1}'`)).rows[0].is_active === true; })());
await as(U.w2, "authenticated", `update public.worker_profiles set visible_to_employers=true, headline='Armador' where user_id='${U.w2}'`);
ok("candidate_cards: la empresa ve candidatos visibles", (await as(U.b1, "authenticated", `select 1 from public.candidate_cards where user_id='${U.w2}'`)).rows.length === 1);
ok("candidate_cards: un trabajador no puede verlos", (await as(U.w1, "authenticated", `select 1 from public.candidate_cards`)).rows.length === 0);
ok("candidate_cards no expone teléfono", !(await db.query(`select * from public.candidate_cards limit 0`)).fields.some((f) => f.name === "phone"));

// Formalización
const reqs = (await db.query(`select count(*)::int c from public.formalization_requirements`)).rows[0].c;
ok(`catálogo de requisitos sembrado (${reqs})`, reqs >= 10);
ok("empresa B no ve diagnósticos de A", (await as(U.b2, "authenticated", `select 1 from public.formalization_diagnostics`)).rows.length === 0);

// Admin / auditoría / límites / conocimiento
ok("un usuario normal no lee auditoría", (await as(U.w1, "authenticated", `select 1 from public.audit_logs`)).rows.length === 0);
ok("un usuario normal no puede escribirse roles", await fails(U.w1, "authenticated", `insert into public.user_roles values ('${U.w1}','admin')`));
ok("rate limit: 3 permitidas y la 4ª bloqueada", await (async () => { const r = []; for (let i = 0; i < 4; i++) r.push((await as(null, "service_role", `select public.check_rate_limit('t', 3, 60) as ok`)).rows[0].ok); return r.join() === "true,true,true,false"; })());
ok("usuarios normales no pueden ejecutar check_rate_limit", await fails(U.w1, "authenticated", `select public.check_rate_limit('x', 1, 1)`));
ok("search_knowledge devuelve fuentes", (await as(null, "anon", `select * from public.search_knowledge('certificado único laboral')`)).rows.length >= 1);
ok("RUC en formato inválido es rechazado", await fails(U.b1, "authenticated", `update public.businesses set ruc='123' where id='${biz}'`));

console.log(failed ? `\n${failed} verificación(es) fallaron` : "\nTodas las verificaciones SQL/RLS pasaron");
process.exit(failed ? 1 : 0);
