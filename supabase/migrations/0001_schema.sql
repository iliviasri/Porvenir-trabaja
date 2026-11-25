-- =====================================================================
-- PORVENIR TRABAJA · 0001 · Esquema base
-- Plataforma de intermediación laboral y orientación de formalización
-- para El Porvenir, Trujillo, La Libertad (Perú).
-- =====================================================================

-- ---------- Tipos ----------
create type public.app_role as enum ('worker', 'business', 'admin');
create type public.availability_t as enum ('inmediata', 'una_semana', 'un_mes', 'no_disponible');
create type public.work_modality as enum ('presencial', 'hibrido', 'remoto');
create type public.schedule_t as enum ('tiempo_completo', 'medio_tiempo', 'turnos', 'fines_semana', 'por_horas');
create type public.offer_type as enum ('empleo_dependiente', 'practicas_preprofesionales', 'practicas_profesionales', 'otro');
create type public.job_status as enum ('borrador', 'pendiente_moderacion', 'activa', 'cerrada', 'suspendida', 'rechazada');
create type public.application_status as enum ('enviada', 'en_revision', 'preseleccionada', 'entrevista', 'seleccionada', 'descartada');
create type public.business_status as enum ('registrado', 'en_orientacion', 'en_proceso_formalizacion', 'documentacion_en_revision', 'documentacion_verificada', 'suspendido');
create type public.premises_t as enum ('local_fijo', 'taller', 'domicilio', 'ambulante', 'online', 'otro');
create type public.ruc_declared_t as enum ('no_tiene', 'en_tramite', 'tiene', 'no_sabe');
create type public.doc_status as enum ('pendiente', 'presentado', 'aprobado', 'observado');
create type public.task_status as enum ('pendiente', 'en_proceso', 'completado', 'no_aplica');
create type public.req_category as enum ('tributaria', 'municipal', 'laboral', 'otra');
create type public.privacy_req_type as enum ('acceso', 'rectificacion', 'eliminacion', 'oposicion');
create type public.privacy_req_status as enum ('pendiente', 'en_proceso', 'atendida', 'rechazada');

-- ---------- Utilidades ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Identidad ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^9[0-9]{8}$'),
  district text not null default 'El Porvenir',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  consent_privacy_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------- Catálogos ----------
create table public.job_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 100,
  active boolean not null default true
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 2 and 60),
  name text not null check (char_length(name) between 2 and 60),
  created_at timestamptz not null default now()
);

-- ---------- Trabajadores ----------
create table public.worker_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 1500),
  main_sector_id uuid references public.job_categories (id) on delete set null,
  availability public.availability_t not null default 'inmediata',
  schedule_pref public.schedule_t[] not null default '{}',
  modality_pref public.work_modality[] not null default '{presencial}',
  expected_salary_min numeric(10,2) check (expected_salary_min is null or expected_salary_min >= 0),
  expected_salary_max numeric(10,2) check (expected_salary_max is null or expected_salary_max >= 0),
  years_experience numeric(4,1) not null default 0 check (years_experience between 0 and 60),
  travel_ok boolean not null default false,
  cv_path text,
  cv_uploaded_at timestamptz,
  visible_to_employers boolean not null default false,
  cv_generated_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_salary_max is null or expected_salary_min is null or expected_salary_max >= expected_salary_min)
);
create trigger trg_worker_profiles_updated before update on public.worker_profiles
  for each row execute function public.set_updated_at();

create table public.worker_skills (
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (worker_id, skill_id)
);
create index idx_worker_skills_skill on public.worker_skills (skill_id);

create table public.worker_experiences (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  role_title text not null check (char_length(role_title) between 2 and 120),
  company text check (char_length(company) <= 120),
  sector_id uuid references public.job_categories (id) on delete set null,
  months int not null default 0 check (months between 0 and 720),
  description text check (char_length(description) <= 800),
  created_at timestamptz not null default now()
);
create index idx_worker_exp_worker on public.worker_experiences (worker_id);

-- ---------- Negocios ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  trade_name text not null check (char_length(trade_name) between 2 and 120),
  legal_name text check (char_length(legal_name) <= 160),
  ruc text check (ruc is null or ruc ~ '^(10|15|16|17|20)[0-9]{9}$'),
  ruc_declared public.ruc_declared_t not null default 'no_sabe',
  ruc_verified boolean not null default false,
  ruc_verified_at timestamptz,
  ruc_verified_source text,
  sector_id uuid references public.job_categories (id) on delete set null,
  activity_description text check (char_length(activity_description) <= 1000),
  description text check (char_length(description) <= 1500),
  products_services text check (char_length(products_services) <= 1000),
  premises public.premises_t not null default 'local_fijo',
  workers_count int not null default 0 check (workers_count between 0 and 10000),
  address text check (char_length(address) <= 200),
  district text not null default 'El Porvenir' check (district = 'El Porvenir'),
  status public.business_status not null default 'registrado',
  is_public boolean not null default false,
  is_demo boolean not null default false,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_businesses_owner on public.businesses (owner_id);
create index idx_businesses_status on public.businesses (status);
create trigger trg_businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();

create table public.business_contacts (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  phone text check (phone is null or phone ~ '^9[0-9]{8}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^9[0-9]{8}$'),
  email text check (char_length(email) <= 160),
  website text check (char_length(website) <= 200),
  show_public boolean not null default false
);

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index idx_business_members_user on public.business_members (user_id);

-- ---------- Formalización ----------
create table public.formalization_requirements (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version int not null default 1,
  category public.req_category not null,
  title text not null,
  summary text not null,
  plain_explanation text not null,
  documents jsonb not null default '[]'::jsonb,
  applies_when jsonb not null default '{}'::jsonb,
  caveats text,
  source_label text not null,
  source_url text,
  last_reviewed_at date not null default current_date,
  sort_order int not null default 100,
  active boolean not null default true,
  unique (code, version)
);
create index idx_form_req_active on public.formalization_requirements (active, sort_order);

create table public.formalization_diagnostics (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  answers jsonb not null,
  free_text text check (char_length(free_text) <= 3000),
  ai_summary text,
  ai_generated boolean not null default false,
  catalog_snapshot jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_form_diag_business on public.formalization_diagnostics (business_id, created_at desc);

create table public.formalization_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  requirement_id uuid not null references public.formalization_requirements (id) on delete restrict,
  diagnostic_id uuid references public.formalization_diagnostics (id) on delete set null,
  status public.task_status not null default 'pendiente',
  note text check (char_length(note) <= 500),
  due_date date,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (business_id, requirement_id)
);
create trigger trg_form_tasks_updated before update on public.formalization_tasks
  for each row execute function public.set_updated_at();

create table public.formalization_task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.formalization_tasks (id) on delete cascade,
  old_status public.task_status,
  new_status public.task_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index idx_form_hist_task on public.formalization_task_history (task_id, created_at desc);

create table public.business_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  requirement_id uuid references public.formalization_requirements (id) on delete set null,
  doc_label text not null check (char_length(doc_label) between 2 and 120),
  file_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  status public.doc_status not null default 'presentado',
  review_notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_business_docs_business on public.business_documents (business_id, created_at desc);

create table public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  from_status public.business_status,
  to_status public.business_status not null,
  notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_business_verif_business on public.business_verifications (business_id, created_at desc);

-- ---------- Empleo ----------
create table public.job_offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 40 and 5000),
  category_id uuid references public.job_categories (id) on delete set null,
  offer_type public.offer_type not null default 'empleo_dependiente',
  salary_min numeric(10,2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(10,2) check (salary_max is null or salary_max >= 0),
  schedule_type public.schedule_t not null default 'tiempo_completo',
  schedule_text text check (char_length(schedule_text) <= 200),
  modality public.work_modality not null default 'presencial',
  experience_min_years numeric(4,1) not null default 0 check (experience_min_years between 0 and 40),
  vacancies int not null default 1 check (vacancies between 1 and 500),
  address text not null check (char_length(address) between 3 and 200),
  district text not null default 'El Porvenir' check (district = 'El Porvenir'),
  status public.job_status not null default 'borrador',
  moderation_notes text,
  moderated_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  closes_at date,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_max is null or salary_min is null or salary_max >= salary_min)
);
create index idx_jobs_status on public.job_offers (status, published_at desc);
create index idx_jobs_business on public.job_offers (business_id);
create index idx_jobs_category on public.job_offers (category_id);
create index idx_jobs_search on public.job_offers
  using gin (to_tsvector('spanish', title || ' ' || description));
create trigger trg_jobs_updated before update on public.job_offers
  for each row execute function public.set_updated_at();

create table public.job_required_skills (
  job_id uuid not null references public.job_offers (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  required boolean not null default true,
  primary key (job_id, skill_id)
);
create index idx_job_skills_skill on public.job_required_skills (skill_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_offers (id) on delete cascade,
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  cover_note text check (char_length(cover_note) <= 1000),
  consent_share_profile boolean not null default true check (consent_share_profile),
  status public.application_status not null default 'enviada',
  employer_notes text check (char_length(employer_notes) <= 1000),
  match_score int check (match_score between 0 and 100),
  match_detail jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id)
);
create index idx_applications_worker on public.applications (worker_id, created_at desc);
create index idx_applications_job on public.applications (job_id, status);
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  old_status public.application_status,
  new_status public.application_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_app_hist_app on public.application_status_history (application_id, created_at);

create table public.saved_jobs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.job_offers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- Recomendaciones calculadas (caché auditable del motor determinista)
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  job_id uuid not null references public.job_offers (id) on delete cascade,
  score int not null check (score between 0 and 100),
  breakdown jsonb not null,
  config_version int not null default 1,
  created_at timestamptz not null default now(),
  unique (worker_id, job_id)
);

-- Configuración de ponderaciones del match (una sola fila)
create table public.matching_config (
  id int primary key default 1 check (id = 1),
  version int not null default 1,
  weights jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------- Chat y conocimiento ----------
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  context text,
  created_at timestamptz not null default now()
);
create index idx_chat_conv_user on public.chat_conversations (user_id, created_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  sources jsonb,
  created_at timestamptz not null default now()
);
create index idx_chat_msg_conv on public.chat_messages (conversation_id, created_at);

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null check (char_length(content) <= 8000),
  category text not null default 'plataforma' check (category in ('plataforma', 'empleo', 'formalizacion', 'laboral', 'privacidad', 'otro')),
  url text,
  is_official boolean not null default false,
  last_updated date not null default current_date,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_knowledge_search on public.knowledge_sources
  using gin (to_tsvector('spanish', title || ' ' || content));

-- ---------- Operación ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_created on public.audit_logs (created_at desc);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.privacy_req_type not null,
  message text check (char_length(message) <= 1500),
  status public.privacy_req_status not null default 'pendiente',
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index idx_privacy_user on public.privacy_requests (user_id, created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- ---------- Funciones de autorización (security definer: evitan recursión de RLS) ----------
create or replace function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = r);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role('admin');
$$;

create or replace function public.is_service_role() returns boolean
language sql stable as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

create or replace function public.is_business_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.business_members where business_id = b and user_id = auth.uid());
$$;

create or replace function public.job_business(j uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from public.job_offers where id = j;
$$;

create or replace function public.business_is_suspended(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'suspendido' from public.businesses where id = b), false);
$$;

create or replace function public.business_has_active_job(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.job_offers where business_id = b and status = 'activa');
$$;

create or replace function public.worker_applied_to(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications where job_id = j and worker_id = auth.uid());
$$;

create or replace function public.can_view_job(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.job_offers o
    where o.id = j
      and (o.status = 'activa'
           or public.is_business_member(o.business_id)
           or public.is_admin()
           or exists (select 1 from public.applications a where a.job_id = o.id and a.worker_id = auth.uid()))
  );
$$;

-- Un negocio puede ver el perfil de un trabajador SOLO si éste postuló a una de sus ofertas y autorizó compartirlo.
create or replace function public.employer_can_see_worker(w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    join public.job_offers j on j.id = a.job_id
    join public.business_members bm on bm.business_id = j.business_id
    where a.worker_id = w and a.consent_share_profile and bm.user_id = auth.uid()
  );
$$;

-- Límite de solicitudes (ventana fija). Solo service_role puede ejecutarla.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end
  returning count into c;
  return c <= p_max;
end $$;
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- ---------- Triggers de negocio ----------

-- Alta de usuario: perfil + rol (solo worker/business; el rol admin se concede manualmente)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data ->> 'role', 'worker');
begin
  if r not in ('worker', 'business') then r := 'worker'; end if;
  insert into public.profiles (id, full_name, phone, consent_privacy_at, consent_version)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    case when (new.raw_user_meta_data ->> 'phone') ~ '^9[0-9]{8}$' then new.raw_user_meta_data ->> 'phone' end,
    case when (new.raw_user_meta_data ->> 'accepted_privacy') = 'true' then now() end,
    nullif(new.raw_user_meta_data ->> 'consent_version', '')
  );
  insert into public.user_roles (user_id, role) values (new.id, r::public.app_role);
  if r = 'worker' then
    insert into public.worker_profiles (user_id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Los usuarios no pueden activarse/desactivarse a sí mismos
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if not (public.is_admin() or public.is_service_role()) then
    new.is_active := old.is_active;
    new.is_demo := old.is_demo;
    new.id := old.id;
  end if;
  return new;
end $$;
create trigger trg_profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- El dueño se registra como miembro del negocio
create or replace function public.add_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_members (business_id, user_id, member_role) values (new.id, new.owner_id, 'owner');
  insert into public.business_contacts (business_id) values (new.id);
  return new;
end $$;
create trigger trg_business_owner after insert on public.businesses
  for each row execute function public.add_owner_member();

-- Campos sensibles del negocio solo modificables por administración / servicio
create or replace function public.protect_business_columns() returns trigger
language plpgsql as $$
begin
  if not (public.is_admin() or public.is_service_role()) then
    new.ruc_verified := old.ruc_verified;
    new.ruc_verified_at := old.ruc_verified_at;
    new.ruc_verified_source := old.ruc_verified_source;
    new.admin_notes := old.admin_notes;
    new.is_demo := old.is_demo;
    new.owner_id := old.owner_id;
    -- el negocio puede avanzar hasta "documentación en revisión"; no puede verificarse ni reactivarse solo
    if new.status in ('documentacion_verificada', 'suspendido') and new.status is distinct from old.status then
      new.status := old.status;
    end if;
    if old.status = 'suspendido' then new.status := old.status; end if;
  end if;
  return new;
end $$;
create trigger trg_business_protect before update on public.businesses
  for each row execute function public.protect_business_columns();

-- Ofertas: empresas no pueden activar/reactivar; editar una oferta activa la devuelve a moderación
create or replace function public.job_offers_guard() returns trigger
language plpgsql as $$
begin
  if public.is_admin() or public.is_service_role() then return new; end if;
  if tg_op = 'UPDATE' then
    new.moderation_notes := old.moderation_notes;
    new.moderated_by := old.moderated_by;
    new.published_at := old.published_at;
    new.is_demo := old.is_demo;
    new.business_id := old.business_id;
    if old.status = 'suspendida' then
      raise exception 'La oferta está suspendida; contacta a la administración.';
    end if;
    -- Una empresa nunca activa por sí misma: toda activación pasa por moderación.
    if new.status = 'activa' and old.status <> 'activa' then
      new.status := 'pendiente_moderacion';
    end if;
    if old.status = 'activa' and new.status = 'activa' then
      if (new.title, new.description, new.salary_min, new.salary_max, new.offer_type, new.address, new.schedule_type, new.modality)
         is distinct from
         (old.title, old.description, old.salary_min, old.salary_max, old.offer_type, old.address, old.schedule_type, old.modality) then
        new.status := 'pendiente_moderacion';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger trg_job_offers_guard before insert or update on public.job_offers
  for each row execute function public.job_offers_guard();

-- Postulaciones: historial de estados y protección de columnas
create or replace function public.applications_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_status_history (application_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.application_status_history (application_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger trg_applications_log after insert or update of status on public.applications
  for each row execute function public.applications_log();

create or replace function public.applications_guard() returns trigger
language plpgsql as $$
begin
  if not (public.is_admin() or public.is_service_role()) then
    new.job_id := old.job_id;
    new.worker_id := old.worker_id;
    new.cover_note := old.cover_note;
    new.consent_share_profile := old.consent_share_profile;
    new.match_score := old.match_score;
    new.match_detail := old.match_detail;
  end if;
  return new;
end $$;
create trigger trg_applications_guard before update on public.applications
  for each row execute function public.applications_guard();

-- Tareas de formalización: historial
create or replace function public.form_tasks_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.formalization_task_history (task_id, old_status, new_status, changed_by, note)
    values (new.id, null, new.status, auth.uid(), 'Tarea generada a partir del diagnóstico');
  elsif new.status is distinct from old.status then
    insert into public.formalization_task_history (task_id, old_status, new_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), new.note);
  end if;
  return new;
end $$;
create trigger trg_form_tasks_log after insert or update of status on public.formalization_tasks
  for each row execute function public.form_tasks_log();

-- Vista de candidatos (sin datos de contacto) para recomendaciones a empresas.
-- Solo visible a usuarios con rol business y perfiles que autorizaron ser visibles.
create or replace view public.candidate_cards as
select
  w.user_id,
  split_part(p.full_name, ' ', 1) as display_name,
  w.headline, w.bio, w.main_sector_id, w.availability, w.schedule_pref, w.modality_pref,
  w.years_experience, w.travel_ok, w.expected_salary_min, w.expected_salary_max,
  coalesce((select array_agg(s.name order by s.name)
            from public.worker_skills ws join public.skills s on s.id = ws.skill_id
            where ws.worker_id = w.user_id), '{}') as skills,
  coalesce((select array_agg(distinct e.sector_id) filter (where e.sector_id is not null)
            from public.worker_experiences e where e.worker_id = w.user_id), '{}') as exp_sector_ids,
  coalesce((select sum(e.months) from public.worker_experiences e where e.worker_id = w.user_id), 0)::int as exp_months
from public.worker_profiles w
join public.profiles p on p.id = w.user_id
where w.visible_to_employers and p.is_active and public.has_role('business');
grant select on public.candidate_cards to authenticated;
