"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { ActionButton, Feedback, SubmitButton, applyFieldErrors, useRunner } from "@/components/forms/shared";
import { experienceSchema, workerProfileSchema, type ExperienceInput, type WorkerProfileInput } from "@/lib/validators";
import { addExperience, deleteExperience, saveWorkerProfile } from "@/actions/worker";
import { AVAILABILITIES, MODALITIES, SCHEDULES, label } from "@/lib/constants";

type Option = { id: string; name: string };

export function WorkerProfileForm({ defaults, sectors, skillSuggestions }: { defaults: WorkerProfileInput; sectors: Option[]; skillSuggestions: string[] }) {
  const { pending, msg, run } = useRunner();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<WorkerProfileInput>({ resolver: zodResolver(workerProfileSchema), defaultValues: defaults });
  return (
    <form onSubmit={handleSubmit((v) => run(() => saveWorkerProfile(v), { onError: (r) => applyFieldErrors(r, setError) }))} className="space-y-8" noValidate>
      <section className="space-y-4">
        <h2 className="text-xl">Datos personales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="full_name" error={errors.full_name?.message}><Input id="full_name" {...register("full_name")} /></Field>
          <Field label="Celular" htmlFor="phone" error={errors.phone?.message} hint="9 dígitos"><Input id="phone" inputMode="numeric" maxLength={9} {...register("phone")} /></Field>
        </div>
        <Field label="¿A qué te dedicas? (título corto)" htmlFor="headline" error={errors.headline?.message} hint="Ej.: Armador de calzado con 3 años de experiencia">
          <Input id="headline" maxLength={120} {...register("headline")} />
        </Field>
        <Field label="Cuéntanos sobre ti" htmlFor="bio" error={errors.bio?.message}><Textarea id="bio" maxLength={1500} {...register("bio")} /></Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Habilidades y experiencia</h2>
        <Field label="Habilidades" htmlFor="skills" error={errors.skills?.message} hint={`Sepáralas con comas. Ej.: ${skillSuggestions.slice(0, 3).join(", ") || "Atención al cliente, Ventas"}`}>
          <Textarea id="skills" className="min-h-[80px]" {...register("skills")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sector principal" htmlFor="main_sector_id">
            <Select id="main_sector_id" {...register("main_sector_id")}><option value="">Sin especificar</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          </Field>
          <Field label="Años de experiencia total" htmlFor="years_experience" error={errors.years_experience?.message}>
            <Input id="years_experience" inputMode="decimal" {...register("years_experience")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Disponibilidad y preferencias</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="¿Cuándo puedes empezar?" htmlFor="availability">
            <Select id="availability" {...register("availability")}>{AVAILABILITIES.map((a) => <option key={a} value={a}>{label(a)}</option>)}</Select>
          </Field>
          <Field label="Pretensión salarial mensual (S/)" error={errors.expected_salary_min?.message ?? errors.expected_salary_max?.message}>
            <div className="flex items-center gap-2">
              <Input aria-label="Mínimo" placeholder="Mín." inputMode="decimal" {...register("expected_salary_min")} />
              <span>–</span>
              <Input aria-label="Máximo" placeholder="Máx." inputMode="decimal" {...register("expected_salary_max")} />
            </div>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Horarios que prefieres</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">{SCHEDULES.map((s) => <label key={s} className="flex items-center gap-2"><Checkbox className="mt-0" value={s} {...register("schedule_pref")} />{label(s)}</label>)}</div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Modalidad</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">{MODALITIES.map((m) => <label key={m} className="flex items-center gap-2"><Checkbox className="mt-0" value={m} {...register("modality_pref")} />{label(m)}</label>)}</div>
          {errors.modality_pref && <p role="alert" className="mt-1 text-sm font-medium text-destructive">{errors.modality_pref.message}</p>}
        </fieldset>
        <label className="flex items-start gap-3"><Checkbox {...register("travel_ok")} /><span>Puedo movilizarme a otras zonas fuera de mi sector.</span></label>
      </section>

      <section className="space-y-2 rounded-lg border bg-secondary/50 p-4">
        <h2 className="text-xl">Privacidad</h2>
        <label className="flex items-start gap-3"><Checkbox {...register("visible_to_employers")} />
          <span>Permitir que las empresas verificadas de El Porvenir encuentren mi perfil laboral (sin mostrar mi teléfono ni correo). Si no lo marcas, solo verán tu perfil las empresas a las que postules.</span>
        </label>
      </section>

      <Feedback msg={msg} />
      <SubmitButton pending={pending} size="lg">Guardar perfil</SubmitButton>
    </form>
  );
}

export function ExperienceForm({ sectors }: { sectors: Option[] }) {
  const { pending, msg, run } = useRunner();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ExperienceInput>({
    resolver: zodResolver(experienceSchema), defaultValues: { role_title: "", company: "", sector_id: "", years: "", months: "", description: "" },
  });
  return (
    <form onSubmit={handleSubmit((v) => run(() => addExperience(v), { onOk: () => reset(), onError: (r) => applyFieldErrors(r, setError) }))} className="space-y-4 rounded-lg border bg-card p-4" noValidate>
      <h3 className="text-lg font-semibold">Agregar experiencia</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo o tarea" htmlFor="role_title" error={errors.role_title?.message}><Input id="role_title" placeholder="Ej.: Pegador de suelas" {...register("role_title")} /></Field>
        <Field label="Negocio o empresa (opcional)" htmlFor="company"><Input id="company" {...register("company")} /></Field>
        <Field label="Sector" htmlFor="exp_sector"><Select id="exp_sector" {...register("sector_id")}><option value="">Sin especificar</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Tiempo" error={errors.years?.message ?? errors.months?.message}>
          <div className="flex items-center gap-2"><Input aria-label="Años" placeholder="Años" inputMode="numeric" {...register("years")} /><Input aria-label="Meses" placeholder="Meses" inputMode="numeric" {...register("months")} /></div>
        </Field>
      </div>
      <Field label="¿Qué hacías? (opcional)" htmlFor="exp_desc"><Textarea id="exp_desc" className="min-h-[70px]" {...register("description")} /></Field>
      <Feedback msg={msg} />
      <SubmitButton pending={pending} variant="secondary">Agregar</SubmitButton>
    </form>
  );
}

export function DeleteExperienceButton({ id }: { id: string }) {
  return <ActionButton action={() => deleteExperience(id)} confirm="¿Eliminar esta experiencia?" variant="ghost"><Trash2 /> Quitar</ActionButton>;
}

export { Button };
