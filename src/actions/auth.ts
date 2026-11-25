"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homePathFor, type ActionResult, type Role } from "@/lib/auth";
import { fieldErrors, firstIssue, loginSchema, registerSchema } from "@/lib/validators";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { CONSENT_VERSION } from "@/lib/constants";
import { log } from "@/lib/logger";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export async function signInAction(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };

  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 15, 600))) return { ok: false, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    log("warn", "auth.login.failed", { ip });
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle(),
  ]);
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    return { ok: false, error: "Tu cuenta está desactivada. Contacta a la administración." };
  }
  const list = (roles ?? []).map((r: { role: Role }) => r.role);
  return { ok: true, data: { redirectTo: safeNext(next) ?? homePathFor(list) } };
}

export async function signUpAction(input: unknown): Promise<ActionResult<{ redirectTo?: string; needsConfirmation?: boolean }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), fieldErrors: fieldErrors(parsed.error) };

  const ip = await clientIp();
  if (!(await rateLimit(`signup:${ip}`, 8, 3600))) return { ok: false, error: "Demasiados registros desde esta conexión. Inténtalo más tarde." };

  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
      // El rol "admin" nunca se acepta aquí; el trigger de BD también lo descarta.
      data: { role: v.role, full_name: v.full_name, phone: v.phone, accepted_privacy: "true", consent_version: CONSENT_VERSION },
    },
  });
  if (error) {
    log("warn", "auth.signup.failed", { code: error.code });
    return { ok: false, error: error.code === "weak_password" ? "La contraseña es muy débil. Usa una más larga." : "No pudimos crear la cuenta. Verifica tus datos e inténtalo de nuevo." };
  }
  if (data.session) return { ok: true, data: { redirectTo: homePathFor([v.role]) } };
  return { ok: true, message: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa.", data: { needsConfirmation: true } };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
