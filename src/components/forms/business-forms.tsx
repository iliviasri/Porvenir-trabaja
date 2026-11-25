"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Feedback, SubmitButton, applyFieldErrors, useRunner } from "@/components/forms/shared";
import { businessSchema, diagnosticAnswersSchema, jobSchema, type BusinessInput, type DiagnosticAnswers, type JobInput } from "@/lib/validators";
import { saveBusiness, saveDiagnostic, updateTask } from "@/actions/business";
import { saveJob } from "@/actions/jobs";
import { MODALITIES, OFFER_TYPES, OFFER_TYPE_NOTICE, PREMISES, RUC_DECLARED, SCHEDULES, TASK_STATUSES, label } from "@/lib/constants";

type Option = { id: string; name: string };

export function BusinessForm({ defaults, sectors, isNew }: { defaults: BusinessInput; sectors: Option[]; isNew: boolean }) {
  const { pending, msg, run, router } = useRunner();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<BusinessInput>({ resolver: zodResolver(businessSchema), defaultValues: defaults });
  return (
    <form onSubmit={handleSubmit((v) => run(() => saveBusiness(v), { refresh: true, onOk: () => { if (isNew) router.push("/empresa/diagnostico"); }, onError: (r) => applyFieldErrors(r, setError) }))} className="space-y-8" noValidate>
      <section className="space-y-4">
        <h2 className="text-xl">Datos del negocio</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial" htmlFor="trade_name" error={errors.trade_name?.message}><Input id="trade_name" {...register("trade_name")} /></Field>
          <Field label="Razón social (si tiene)" htmlFor="legal_name" error={errors.legal_name?.message}><Input id="legal_name" {...register("legal_name")} /></Field>
          <Field label="Rubro" htmlFor="sector_id"><Select id="sector_id" {...register("sector_id")}><option value="">Elegir…</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Dirección en El Porvenir" htmlFor="address" error={errors.address?.message}><Input id="address" {...register("address")} /></Field>
        </div>
        <Field label="¿A qué se dedica tu negocio?" htmlFor="activity_description" error={errors.activity_description?.message} hint="Ej.: Fabricamos calzado de cuero para damas y vendemos por mayor.">
          <Textarea id="activity_description" {...register("activity_description")} />
        </Field>
        <Field label="Productos o servicios (opcional)" htmlFor="products_services"><Textarea id="products_services" className="min-h-[80px]" {...register("products_services")} /></Field>
        <Field label="Descripción para tu ficha pública (opcional)" htmlFor="description"><Textarea id="description" className="min-h-[80px]" {...register("description")} /></Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Situación de formalización</h2>
        <Alert variant="info">Esta información es <strong>declarada por ti</strong>. La plataforma no la verifica ante SUNAT; la administración solo puede marcarla como verificada citando una fuente.</Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="¿Tienes RUC?" htmlFor="ruc_declared"><Select id="ruc_declared" {...register("ruc_declared")}>{RUC_DECLARED.map((r) => <option key={r} value={r}>{label(r)}</option>)}</Select></Field>
          <Field label="Número de RUC (si lo tienes)" htmlFor="ruc" error={errors.ruc?.message}><Input id="ruc" inputMode="numeric" maxLength={11} {...register("ruc")} /></Field>
          <Field label="¿Dónde funciona?" htmlFor="premises"><Select id="premises" {...register("premises")}>{PREMISES.map((p) => <option key={p} value={p}>{label(p)}</option>)}</Select></Field>
          <Field label="Personas que trabajan contigo" htmlFor="workers_count" error={errors.workers_count?.message}><Input id="workers_count" type="number" min={0} inputMode="numeric" {...register("workers_count", { valueAsNumber: true })} /></Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Directorio y contacto</h2>
        <label className="flex items-start gap-3"><Checkbox {...register("is_public")} /><span>Mostrar mi negocio en el <strong>Directorio de empresas</strong>.</span></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" error={errors.contact_phone?.message}><Input inputMode="numeric" maxLength={9} {...register("contact_phone")} /></Field>
          <Field label="WhatsApp" error={errors.contact_whatsapp?.message}><Input inputMode="numeric" maxLength={9} {...register("contact_whatsapp")} /></Field>
          <Field label="Correo de contacto" error={errors.contact_email?.message}><Input type="email" {...register("contact_email")} /></Field>
          <Field label="Sitio web o red social" error={errors.contact_website?.message}><Input {...register("contact_website")} /></Field>
        </div>
        <label className="flex items-start gap-3"><Checkbox {...register("show_contact")} /><span>Autorizo mostrar estos datos de contacto públicamente en mi ficha.</span></label>
      </section>

      <Feedback msg={msg} />
      <SubmitButton pending={pending} size="lg">{isNew ? "Registrar mi negocio" : "Guardar cambios"}</SubmitButton>
    </form>
  );
}

export function JobForm({ jobId, defaults, categories, isActive }: { jobId: string | null; defaults: JobInput; categories: Option[]; isActive?: boolean }) {
  const { pending, msg, run, router } = useRunner();
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<JobInput>({ resolver: zodResolver(jobSchema), defaultValues: defaults });
  const type = watch("offer_type");
  const send = (submit: boolean) => handleSubmit((v) => run(() => saveJob(jobId, { ...v, submit_for_review: submit }), {
    refresh: true, onOk: () => router.push("/empresa/ofertas"), onError: (r) => applyFieldErrors(r, setError),
  }))();
  return (
    <form onSubmit={(e) => { e.preventDefault(); send(true); }} className="space-y-6" noValidate>
      {isActive && <Alert variant="warning">Esta oferta está activa. Si cambias el contenido, volverá a moderación antes de mostrarse.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo o puesto" htmlFor="title" error={errors.title?.message} className="sm:col-span-2"><Input id="title" {...register("title")} /></Field>
        <Field label="Sector" htmlFor="category_id" error={errors.category_id?.message}><Select id="category_id" {...register("category_id")}><option value="">Elegir…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Tipo de oportunidad" htmlFor="offer_type"><Select id="offer_type" {...register("offer_type")}>{OFFER_TYPES.map((o) => <option key={o} value={o}>{label(o)}</option>)}</Select></Field>
      </div>
      {OFFER_TYPE_NOTICE[type] && <Alert variant="warning">{OFFER_TYPE_NOTICE[type]} Se mostrará claramente a los postulantes.</Alert>}
      <Field label="Descripción de funciones y condiciones" htmlFor="description" error={errors.description?.message} hint="No pidas pagos, depósitos ni datos bancarios. Evita requisitos de sexo, edad o apariencia.">
        <Textarea id="description" className="min-h-[170px]" {...register("description")} />
      </Field>
      <Field label="Habilidades solicitadas" htmlFor="skills" error={errors.skills?.message} hint="Sepáralas con comas. Ej.: Aparado de calzado, Corte de cuero"><Textarea id="skills" className="min-h-[70px]" {...register("skills")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Remuneración mensual (S/)" error={errors.salary_min?.message ?? errors.salary_max?.message} hint="Déjalo vacío si es «a convenir»">
          <div className="flex items-center gap-2"><Input aria-label="Mínimo" placeholder="Mín." inputMode="decimal" {...register("salary_min")} /><span>–</span><Input aria-label="Máximo" placeholder="Máx." inputMode="decimal" {...register("salary_max")} /></div>
        </Field>
        <Field label="Experiencia mínima (años)" htmlFor="experience_min_years" error={errors.experience_min_years?.message}><Input id="experience_min_years" inputMode="decimal" {...register("experience_min_years")} /></Field>
        <Field label="Jornada" htmlFor="schedule_type"><Select id="schedule_type" {...register("schedule_type")}>{SCHEDULES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></Field>
        <Field label="Horario (ej. L-S 8:00 a 17:00)" htmlFor="schedule_text"><Input id="schedule_text" {...register("schedule_text")} /></Field>
        <Field label="Modalidad" htmlFor="modality"><Select id="modality" {...register("modality")}>{MODALITIES.map((m) => <option key={m} value={m}>{label(m)}</option>)}</Select></Field>
        <Field label="Vacantes" htmlFor="vacancies" error={errors.vacancies?.message}><Input id="vacancies" type="number" min={1} {...register("vacancies", { valueAsNumber: true })} /></Field>
        <Field label="Lugar de trabajo (El Porvenir)" htmlFor="address" error={errors.address?.message}><Input id="address" {...register("address")} /></Field>
        <Field label="Cierre de convocatoria (opcional)" htmlFor="closes_at"><Input id="closes_at" type="date" {...register("closes_at")} /></Field>
      </div>
      <Feedback msg={msg} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending} size="lg">Enviar a moderación</SubmitButton>
        {!isActive && <Button type="button" variant="outline" size="lg" disabled={pending} onClick={() => { setValue("submit_for_review", false); send(false); }}>Guardar borrador</Button>}
      </div>
    </form>
  );
}

const YES_NO = [{ v: true, l: "Sí" }, { v: false, l: "No" }];

export function DiagnosticForm({ defaults, aiAvailable }: { defaults: Partial<DiagnosticAnswers>; aiAvailable: boolean }) {
  const { pending, msg, run, router } = useRunner();
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiNote, setAiNote] = useState<{ type: "ok" | "error" | "info"; text: string } | null>(null);
  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = useForm<DiagnosticAnswers>({
    resolver: zodResolver(diagnosticAnswersSchema),
    defaultValues: { ruc_status: "no_sabe", premises: "local_fijo", workers_count: 0, wants_hire: false, sells_to_businesses: false, has_municipal_license: "no_sabe", ...defaults },
  });

  async function analyze() {
    setAnalyzing(true); setAiNote(null);
    try {
      const res = await fetch("/api/formaliza", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ free_text: text }) });
      const data = await res.json();
      if (!res.ok) { setAiNote({ type: res.status === 503 ? "info" : "error", text: data.error ?? "No se pudo analizar el texto." }); return; }
      const a = data.answers ?? {};
      (["ruc_status", "premises", "has_municipal_license"] as const).forEach((k) => a[k] && setValue(k, a[k]));
      if (typeof a.workers_count === "number") setValue("workers_count", a.workers_count);
      (["wants_hire", "sells_to_businesses"] as const).forEach((k) => typeof a[k] === "boolean" && setValue(k, a[k]));
      setAiNote({ type: "ok", text: "Completé el formulario con lo que entendí. Revisa y corrige cada respuesta." + (data.missing?.length ? ` Falta confirmar: ${data.missing.join("; ")}.` : "") });
    } catch { setAiNote({ type: "error", text: "No se pudo analizar el texto." }); } finally { setAnalyzing(false); }
  }

  return (
    <form onSubmit={handleSubmit((v) => run(() => saveDiagnostic(v, text || undefined), { onOk: () => router.push("/empresa/ruta"), onError: (r) => applyFieldErrors(r, setError) }))} className="space-y-6" noValidate>
      <section className="space-y-3 rounded-lg border bg-secondary/40 p-4">
        <h2 className="flex items-center gap-2 text-lg"><Sparkles className="size-5 text-accent" /> Cuéntanos tu situación con tus palabras (opcional)</h2>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} placeholder="Ej.: Tengo un pequeño taller de fabricación de zapatos, trabajo con tres personas y no tengo RUC. Quiero formalizarme y contratar más trabajadores." aria-label="Describe tu situación" />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!aiAvailable || analyzing || text.trim().length < 10} onClick={analyze}>
            {analyzing && <Loader2 className="animate-spin" />} Completar el formulario con IA
          </Button>
          {!aiAvailable && <span className="text-sm text-muted-foreground">La IA no está configurada en este entorno: completa el formulario manualmente (la ruta se genera igual).</span>}
        </div>
        {aiNote && <Alert variant={aiNote.type === "ok" ? "success" : aiNote.type === "info" ? "info" : "error"}>{aiNote.text}</Alert>}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Confirma los datos de tu negocio</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="¿Tienes RUC?" htmlFor="ruc_status"><Select id="ruc_status" {...register("ruc_status")}>{RUC_DECLARED.map((r) => <option key={r} value={r}>{label(r)}</option>)}</Select></Field>
          <Field label="¿Dónde funciona tu negocio?" htmlFor="premises"><Select id="premises" {...register("premises")}>{PREMISES.map((p) => <option key={p} value={p}>{label(p)}</option>)}</Select></Field>
          <Field label="¿Cuántas personas trabajan contigo?" htmlFor="workers_count" error={errors.workers_count?.message}><Input id="workers_count" type="number" min={0} {...register("workers_count", { valueAsNumber: true })} /></Field>
          <Field label="¿Ya tienes licencia municipal?" htmlFor="has_municipal_license"><Select id="has_municipal_license" {...register("has_municipal_license")}><option value="si">Sí</option><option value="no">No</option><option value="no_sabe">No sé</option></Select></Field>
          <Field label="¿Quieres contratar personal?" htmlFor="wants_hire"><Select id="wants_hire" value={String(watch("wants_hire"))} onChange={(e) => setValue("wants_hire", e.target.value === "true")}>{YES_NO.map((o) => <option key={String(o.v)} value={String(o.v)}>{o.l}</option>)}</Select></Field>
          <Field label="¿Vendes a otras empresas (necesitan factura)?" htmlFor="sells_to_businesses"><Select id="sells_to_businesses" value={String(watch("sells_to_businesses"))} onChange={(e) => setValue("sells_to_businesses", e.target.value === "true")}>{YES_NO.map((o) => <option key={String(o.v)} value={String(o.v)}>{o.l}</option>)}</Select></Field>
        </div>
      </section>
      <Alert variant="info">La ruta se construye con un catálogo de requisitos y reglas verificables. La IA solo redacta la explicación; <strong>no inventa obligaciones</strong> ni emite licencias.</Alert>
      <Feedback msg={msg} />
      <SubmitButton pending={pending} size="lg">Generar mi ruta de formalización</SubmitButton>
    </form>
  );
}

export function TaskControls({ taskId, status, note, dueDate }: { taskId: string; status: string; note: string | null; dueDate: string | null }) {
  const { pending, msg, run } = useRunner();
  const [s, setS] = useState(status);
  const [n, setN] = useState(note ?? "");
  const [d, setD] = useState(dueDate ?? "");
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => updateTask({ task_id: taskId, status: s, note: n, due_date: d })); }} className="grid gap-3 sm:grid-cols-[170px_1fr_160px_auto] sm:items-end">
      <Field label="Estado" htmlFor={`st-${taskId}`}><Select id={`st-${taskId}`} value={s} onChange={(e) => setS(e.target.value)}>{TASK_STATUSES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</Select></Field>
      <Field label="Nota" htmlFor={`nt-${taskId}`}><Input id={`nt-${taskId}`} value={n} maxLength={500} onChange={(e) => setN(e.target.value)} placeholder="Ej.: Cita en SUNAT el lunes" /></Field>
      <Field label="Fecha límite" htmlFor={`dd-${taskId}`}><Input id={`dd-${taskId}`} type="date" value={d} onChange={(e) => setD(e.target.value)} /></Field>
      <SubmitButton pending={pending} variant="secondary">Guardar</SubmitButton>
      {msg && <div className="sm:col-span-4"><Feedback msg={msg} /></div>}
    </form>
  );
}

export function DocumentUpload({ requirements }: { requirements: { id: string; title: string }[] }) {
  const { pending, msg, setMsg, router } = { ...useRunner() };
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("kind", "business-doc");
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setMsg({ type: "error", text: data.error ?? "No se pudo subir." });
      else { setMsg({ type: "ok", text: data.message }); form.reset(); router.refresh(); }
    } catch { setMsg({ type: "error", text: "Error de conexión." }); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <h3 className="text-lg font-semibold">Presentar un documento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿Qué documento es?" htmlFor="doc_label"><Input id="doc_label" name="doc_label" required minLength={2} maxLength={120} placeholder="Ej.: Ficha RUC" /></Field>
        <Field label="Trámite relacionado (opcional)" htmlFor="requirement_id"><Select id="requirement_id" name="requirement_id"><option value="">—</option>{requirements.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</Select></Field>
      </div>
      <Field label="Archivo (PDF, JPG o PNG, máx. 4 MB)" htmlFor="file"><Input id="file" name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className="h-auto py-2" /></Field>
      <p className="text-sm text-muted-foreground">Tus documentos se guardan en un almacenamiento privado y solo los ve tu negocio y la administración. No subas claves ni contraseñas.</p>
      <Feedback msg={msg} />
      <SubmitButton pending={busy || pending}>Enviar a revisión</SubmitButton>
    </form>
  );
}
