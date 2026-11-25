"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/feedback";
import { Feedback, SubmitButton, applyFieldErrors, useRunner } from "@/components/forms/shared";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validators";
import { signInAction, signUpAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const { pending, msg, run, router } = useRunner();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const errText = error === "cuenta_inactiva" ? "Tu cuenta está desactivada." : error === "enlace_invalido" ? "El enlace de confirmación no es válido o venció." : null;
  return (
    <form onSubmit={handleSubmit((v) => run(() => signInAction(v, next), { refresh: false, onOk: (r) => { router.push(r.data?.redirectTo ?? "/"); router.refresh(); } }))} className="space-y-4" noValidate>
      {errText && <Alert variant="error">{errText}</Alert>}
      <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <Feedback msg={msg?.type === "error" ? msg : null} />
      <SubmitButton pending={pending} className="w-full" size="lg">Ingresar</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">¿No tienes cuenta? <Link href="/registro" className="font-medium text-primary underline">Regístrate gratis</Link></p>
    </form>
  );
}

export function RegisterForm({ defaultRole }: { defaultRole?: "worker" | "business" }) {
  const [step, setStep] = useState<1 | 2>(defaultRole ? 2 : 1);
  const [done, setDone] = useState<string | null>(null);
  const { pending, msg, run, router } = useRunner();
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: defaultRole, full_name: "", email: "", phone: "", password: "", accepted_privacy: false },
  });
  const role = watch("role");

  if (done) return <Alert variant="success" title="¡Casi listo!">{done}</Alert>;

  if (step === 1) {
    const opts = [
      { v: "worker" as const, icon: Briefcase, title: "Busco trabajo", desc: "Crea tu perfil o CV, busca empleos en El Porvenir y postula." },
      { v: "business" as const, icon: Store, title: "Tengo un negocio", desc: "Formaliza tu negocio, publica ofertas y encuentra personal." },
    ];
    return (
      <div className="space-y-4">
        <p className="font-medium">¿Cómo quieres usar PORVENIR TRABAJA?</p>
        <div className="grid gap-3">
          {opts.map((o) => (
            <button key={o.v} type="button" onClick={() => { setValue("role", o.v); setStep(2); }}
              className={cn("flex items-start gap-4 rounded-lg border-2 bg-card p-4 text-left hover:border-primary", role === o.v && "border-primary")}>
              <o.icon className="mt-1 size-7 text-primary" />
              <span><span className="block text-lg font-semibold">{o.title}</span><span className="text-muted-foreground">{o.desc}</span></span>
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">¿Ya tienes cuenta? <Link href="/login" className="font-medium text-primary underline">Ingresar</Link></p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) => run(() => signUpAction(v), {
        refresh: false,
        onOk: (r) => (r.data?.redirectTo ? (router.push(r.data.redirectTo), router.refresh()) : setDone(r.message ?? "Revisa tu correo.")),
        onError: (r) => applyFieldErrors(r, setError),
      }))}
      className="space-y-4" noValidate>
      <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
        <span>Cuenta de: <strong>{role === "business" ? "Empresa / comerciante" : "Trabajador"}</strong></span>
        <button type="button" className="font-medium text-primary underline" onClick={() => setStep(1)}>Cambiar</button>
      </div>
      <Field label="Nombre completo" htmlFor="full_name" error={errors.full_name?.message}>
        <Input id="full_name" autoComplete="name" aria-invalid={!!errors.full_name} {...register("full_name")} />
      </Field>
      <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Celular (opcional)" htmlFor="phone" error={errors.phone?.message} hint="9 dígitos, empieza con 9">
        <Input id="phone" type="tel" inputMode="numeric" maxLength={9} autoComplete="tel-national" aria-invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox {...register("accepted_privacy")} />
          <span>Acepto la <Link href="/privacidad" target="_blank" className="font-medium text-primary underline">política de privacidad</Link> y el tratamiento de mis datos personales según la Ley N.º 29733.</span>
        </label>
        {errors.accepted_privacy && <p role="alert" className="mt-1 text-sm font-medium text-destructive">{errors.accepted_privacy.message}</p>}
      </div>
      <Feedback msg={msg?.type === "error" ? msg : null} />
      <SubmitButton pending={pending} className="w-full" size="lg">Crear mi cuenta</SubmitButton>
      <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>Atrás</Button>
    </form>
  );
}
