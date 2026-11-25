// Datos FICTICIOS de demostración. Todo queda marcado con is_demo = true.
// Uso: SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DEMO_PASSWORD en el entorno.
//   node --env-file=.env.local scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !password || password.length < 10) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o DEMO_PASSWORD (mínimo 10 caracteres).");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "yes") {
  console.error("Seed de demo bloqueado en producción. Define ALLOW_DEMO_SEED=yes si es intencional.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const must = (r, ctx) => { if (r.error) { console.error("Error en", ctx, r.error.message); process.exit(1); } return r.data; };

async function ensureUser(email, full_name, role, phone) {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list?.users.find((u) => u.email === email);
  if (!user) {
    const r = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, role: role === "admin" ? "worker" : role, phone, accepted_privacy: "true", consent_version: "demo" } });
    user = must(r, `crear ${email}`).user;
  }
  must(await db.from("profiles").update({ is_demo: true, full_name, phone }).eq("id", user.id), "perfil");
  if (role === "admin") must(await db.from("user_roles").upsert({ user_id: user.id, role: "admin" }), "rol admin");
  return user;
}

const skillId = async (name) => {
  const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const r = must(await db.from("skills").upsert({ slug, name }, { onConflict: "slug" }).select("id").single(), "skill");
  return r.id;
};
const catId = async (slug) => (must(await db.from("job_categories").select("id").eq("slug", slug).maybeSingle(), "cat") ?? {}).id ?? null;
const { data: anyCat } = await db.from("job_categories").select("id, slug").order("sort_order").limit(3);
const cat = (i) => anyCat?.[i % (anyCat?.length || 1)]?.id ?? null;

await ensureUser("admin@demo.porvenirtrabaja.test", "Admin Demo", "admin", "900000001");
const owner1 = await ensureUser("empresa1@demo.porvenirtrabaja.test", "Rosa Demo (ficticia)", "business", "900000002");
const owner2 = await ensureUser("empresa2@demo.porvenirtrabaja.test", "Luis Demo (ficticio)", "business", "900000003");
const w1 = await ensureUser("trabajador1@demo.porvenirtrabaja.test", "Ana Demo (ficticia)", "worker", "900000004");
const w2 = await ensureUser("trabajador2@demo.porvenirtrabaja.test", "Carlos Demo (ficticio)", "worker", "900000005");

const bizDefs = [
  { owner: owner1, trade_name: "[DEMO] Calzados Ficticios SAC", activity_description: "Taller ficticio de calzado para demostración.", sector: 0, ruc_declared: "en_tramite", workers_count: 4 },
  { owner: owner2, trade_name: "[DEMO] Bodega Ejemplo", activity_description: "Bodega ficticia para demostración.", sector: 1, ruc_declared: "no_tiene", workers_count: 1 },
];
const bizIds = [];
for (const b of bizDefs) {
  const { data: ex } = await db.from("businesses").select("id").eq("owner_id", b.owner.id).eq("trade_name", b.trade_name).maybeSingle();
  if (ex) { bizIds.push(ex.id); continue; }
  const r = must(await db.from("businesses").insert({ owner_id: b.owner.id, trade_name: b.trade_name, activity_description: b.activity_description, sector_id: cat(b.sector), ruc_declared: b.ruc_declared, workers_count: b.workers_count, premises: "local_fijo", address: "Dirección ficticia, El Porvenir", is_public: true, is_demo: true }).select("id").single(), "negocio");
  bizIds.push(r.id);
}

const jobDefs = [
  { biz: 0, title: "[DEMO] Operario/a de cortado de calzado", skills: ["Corte de cuero", "Trabajo en equipo"], offer_type: "empleo_dependiente", min: 1130, max: 1500 },
  { biz: 0, title: "[DEMO] Prácticas pre-profesionales en administración", skills: ["Excel", "Atención al cliente"], offer_type: "practicas_preprofesionales", min: 1025, max: 1025 },
  { biz: 1, title: "[DEMO] Atención al cliente en bodega", skills: ["Atención al cliente", "Manejo de caja"], offer_type: "empleo_dependiente", min: 1130, max: 1300 },
];
for (const j of jobDefs) {
  const { data: ex } = await db.from("job_offers").select("id").eq("business_id", bizIds[j.biz]).eq("title", j.title).maybeSingle();
  if (ex) continue;
  const r = must(await db.from("job_offers").insert({
    business_id: bizIds[j.biz], title: j.title, description: "Oferta ficticia creada solo para demostrar la plataforma. No corresponde a una vacante real. Incluye funciones, horario y requisitos de ejemplo para probar filtros y postulaciones.",
    category_id: cat(j.biz), offer_type: j.offer_type, salary_min: j.min, salary_max: j.max, schedule_type: "tiempo_completo", schedule_text: "Lunes a sábado, 8:00 a 17:00", modality: "presencial",
    experience_min_years: 0, vacancies: 1, address: "Dirección ficticia, El Porvenir", status: "activa", published_at: new Date().toISOString(), is_demo: true,
  }).select("id").single(), "oferta");
  for (const s of j.skills) must(await db.from("job_required_skills").upsert({ job_id: r.id, skill_id: await skillId(s), required: true }), "skill oferta");
}

for (const [u, headline, skills, years] of [[w1, "Operaria de calzado (ficticia)", ["Corte de cuero", "Trabajo en equipo"], 3], [w2, "Atención al cliente (ficticio)", ["Atención al cliente", "Manejo de caja"], 1]]) {
  must(await db.from("worker_profiles").update({ headline, bio: "Perfil ficticio de demostración.", years_experience: years, visible_to_employers: true, availability: "inmediata", modality_pref: ["presencial"] }).eq("user_id", u.id), "perfil trabajador");
  for (const s of skills) must(await db.from("worker_skills").upsert({ worker_id: u.id, skill_id: await skillId(s) }), "skill trabajador");
}

console.log("Datos de demostración listos.");
console.log("Cuentas (contraseña = DEMO_PASSWORD): admin@, empresa1@, empresa2@, trabajador1@, trabajador2@ demo.porvenirtrabaja.test");
