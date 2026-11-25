-- =====================================================================
-- PORVENIR TRABAJA · 0002 · Row Level Security
-- Principio: todo cerrado por defecto; el acceso se abre por política.
-- Las operaciones privilegiadas (auditoría, notificaciones, roles) se hacen
-- desde el servidor con la clave service_role, que ignora RLS.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.job_categories enable row level security;
alter table public.skills enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.worker_skills enable row level security;
alter table public.worker_experiences enable row level security;
alter table public.businesses enable row level security;
alter table public.business_contacts enable row level security;
alter table public.business_members enable row level security;
alter table public.formalization_requirements enable row level security;
alter table public.formalization_diagnostics enable row level security;
alter table public.formalization_tasks enable row level security;
alter table public.formalization_task_history enable row level security;
alter table public.business_documents enable row level security;
alter table public.business_verifications enable row level security;
alter table public.job_offers enable row level security;
alter table public.job_required_skills enable row level security;
alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.recommendations enable row level security;
alter table public.matching_config enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.rate_limits enable row level security; -- sin políticas: solo service_role

-- ---------- profiles ----------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.employer_can_see_worker(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ---------- user_roles (solo lectura propia; la gestión es de servidor) ----------
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- catálogos ----------
create policy categories_select on public.job_categories for select using (true);
create policy categories_admin on public.job_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy skills_select on public.skills for select using (true);
create policy skills_insert on public.skills for insert to authenticated
  with check (char_length(name) between 2 and 60 and (public.has_role('worker') or public.has_role('business') or public.is_admin()));
create policy skills_admin on public.skills for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy skills_admin_del on public.skills for delete to authenticated using (public.is_admin());

-- ---------- trabajadores ----------
create policy worker_profiles_select on public.worker_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.employer_can_see_worker(user_id));
create policy worker_profiles_insert on public.worker_profiles for insert to authenticated
  with check (user_id = auth.uid() and public.has_role('worker'));
create policy worker_profiles_update on public.worker_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy worker_skills_select on public.worker_skills for select to authenticated
  using (worker_id = auth.uid() or public.is_admin() or public.employer_can_see_worker(worker_id));
create policy worker_skills_write on public.worker_skills for all to authenticated
  using (worker_id = auth.uid()) with check (worker_id = auth.uid());

create policy worker_exp_select on public.worker_experiences for select to authenticated
  using (worker_id = auth.uid() or public.is_admin() or public.employer_can_see_worker(worker_id));
create policy worker_exp_write on public.worker_experiences for all to authenticated
  using (worker_id = auth.uid()) with check (worker_id = auth.uid());

-- ---------- negocios ----------
create policy businesses_select on public.businesses for select
  using (
    (is_public and status <> 'suspendido')
    or public.business_has_active_job(id)
    or owner_id = auth.uid()
    or public.is_business_member(id)
    or public.is_admin()
  );
create policy businesses_insert on public.businesses for insert to authenticated
  with check (owner_id = auth.uid() and public.has_role('business') and status = 'registrado');
create policy businesses_update on public.businesses for update to authenticated
  using (public.is_business_member(id) or public.is_admin())
  with check (public.is_business_member(id) or public.is_admin());

create policy business_contacts_select on public.business_contacts for select
  using (
    (show_public and exists (select 1 from public.businesses b where b.id = business_id and b.is_public and b.status <> 'suspendido'))
    or public.is_business_member(business_id) or public.is_admin()
  );
create policy business_contacts_write on public.business_contacts for all to authenticated
  using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy business_members_select on public.business_members for select to authenticated
  using (user_id = auth.uid() or public.is_business_member(business_id) or public.is_admin());

-- ---------- formalización ----------
create policy form_req_select on public.formalization_requirements for select using (active or public.is_admin());
create policy form_req_admin on public.formalization_requirements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy form_diag_select on public.formalization_diagnostics for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());
create policy form_diag_insert on public.formalization_diagnostics for insert to authenticated
  with check (public.is_business_member(business_id));

create policy form_tasks_select on public.formalization_tasks for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());
create policy form_tasks_insert on public.formalization_tasks for insert to authenticated
  with check (public.is_business_member(business_id));
create policy form_tasks_update on public.formalization_tasks for update to authenticated
  using (public.is_business_member(business_id) or public.is_admin())
  with check (public.is_business_member(business_id) or public.is_admin());

create policy form_hist_select on public.formalization_task_history for select to authenticated
  using (exists (select 1 from public.formalization_tasks t
                 where t.id = task_id and (public.is_business_member(t.business_id) or public.is_admin())));

create policy business_docs_select on public.business_documents for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());
create policy business_docs_insert on public.business_documents for insert to authenticated
  with check (public.is_business_member(business_id) and status = 'presentado'
              and not public.business_is_suspended(business_id));
create policy business_docs_update_admin on public.business_documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy business_docs_delete on public.business_documents for delete to authenticated
  using (public.is_business_member(business_id) and status in ('presentado', 'observado'));

create policy business_verif_select on public.business_verifications for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());
create policy business_verif_admin on public.business_verifications for insert to authenticated
  with check (public.is_admin());

-- ---------- empleo ----------
create policy jobs_select on public.job_offers for select
  using (status = 'activa' or public.is_business_member(business_id) or public.is_admin() or public.worker_applied_to(id));
create policy jobs_insert on public.job_offers for insert to authenticated
  with check (public.is_business_member(business_id) and status in ('borrador', 'pendiente_moderacion')
              and not public.business_is_suspended(business_id));
create policy jobs_update_member on public.job_offers for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id) and status in ('borrador', 'pendiente_moderacion', 'cerrada', 'activa'));
create policy jobs_update_admin on public.job_offers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy jobs_delete on public.job_offers for delete to authenticated
  using ((public.is_business_member(business_id) and status in ('borrador', 'rechazada')) or public.is_admin());

create policy job_skills_select on public.job_required_skills for select using (public.can_view_job(job_id));
create policy job_skills_write on public.job_required_skills for all to authenticated
  using (public.is_business_member(public.job_business(job_id)))
  with check (public.is_business_member(public.job_business(job_id)));

create policy applications_select on public.applications for select to authenticated
  using (worker_id = auth.uid() or public.is_business_member(public.job_business(job_id)) or public.is_admin());
create policy applications_insert on public.applications for insert to authenticated
  with check (
    worker_id = auth.uid() and public.has_role('worker') and status = 'enviada'
    and exists (select 1 from public.job_offers o where o.id = job_id and o.status = 'activa'
                and (o.closes_at is null or o.closes_at >= current_date))
  );
create policy applications_update_business on public.applications for update to authenticated
  using (public.is_business_member(public.job_business(job_id)))
  with check (public.is_business_member(public.job_business(job_id)));
create policy applications_delete_worker on public.applications for delete to authenticated
  using (worker_id = auth.uid() and status = 'enviada');

create policy app_hist_select on public.application_status_history for select to authenticated
  using (exists (select 1 from public.applications a
                 where a.id = application_id
                   and (a.worker_id = auth.uid() or public.is_business_member(public.job_business(a.job_id)) or public.is_admin())));

create policy saved_jobs_all on public.saved_jobs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy recommendations_all on public.recommendations for all to authenticated
  using (worker_id = auth.uid()) with check (worker_id = auth.uid());

create policy matching_config_select on public.matching_config for select using (true);
create policy matching_config_admin on public.matching_config for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- chat / conocimiento ----------
create policy chat_conv_all on public.chat_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_msg_select on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy chat_msg_insert on public.chat_messages for insert to authenticated
  with check (exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

create policy knowledge_select on public.knowledge_sources for select using (active or public.is_admin());
create policy knowledge_admin on public.knowledge_sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- operación ----------
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy audit_select_admin on public.audit_logs for select to authenticated using (public.is_admin());

create policy privacy_select on public.privacy_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy privacy_insert on public.privacy_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pendiente');
create policy privacy_update_admin on public.privacy_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- búsqueda de conocimiento para el chatbot ----------
create or replace function public.search_knowledge(q text, lim int default 5)
returns table (kind text, id uuid, title text, snippet text, url text, is_official boolean, updated_on date)
language sql stable as $$
  with query as (select websearch_to_tsquery('spanish', q) as tsq)
  (
    select 'conocimiento'::text, k.id, k.title, left(k.content, 700), k.url, k.is_official, k.last_updated
    from public.knowledge_sources k, query
    where k.active and to_tsvector('spanish', k.title || ' ' || k.content) @@ query.tsq
    order by ts_rank(to_tsvector('spanish', k.title || ' ' || k.content), query.tsq) desc
    limit lim
  )
  union all
  (
    select 'requisito'::text, r.id, r.title, left(r.summary || ' ' || r.plain_explanation, 700), r.source_url, true, r.last_reviewed_at
    from public.formalization_requirements r, query
    where r.active and to_tsvector('spanish', r.title || ' ' || r.summary || ' ' || r.plain_explanation) @@ query.tsq
    limit lim
  );
$$;

-- ---------- Storage: buckets privados ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('worker-cvs', 'worker-cvs', false, 4194304, array['application/pdf']),
  ('business-docs', 'business-docs', false, 4194304, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- CV: carpeta = id del trabajador
create policy "cv_owner_all" on storage.objects for all to authenticated
  using (bucket_id = 'worker-cvs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'worker-cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cv_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'worker-cvs' and public.is_admin());

-- Documentos de negocio: carpeta = id del negocio; miembros del negocio
create policy "bizdocs_member_all" on storage.objects for all to authenticated
  using (bucket_id = 'business-docs' and public.is_business_member(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'business-docs' and public.is_business_member(((storage.foldername(name))[1])::uuid));
create policy "bizdocs_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'business-docs' and public.is_admin());
