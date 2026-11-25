import Link from "next/link";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/feedback";
import { PrivacyRequestForm } from "@/components/forms/misc-forms";
import { requireRole, getCurrentUser, homePathFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { label } from "@/lib/constants";
import { redirect } from "next/navigation";

export const metadata = { title: "Privacidad de mis datos" };

export default async function AccountPrivacyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cuenta/privacidad");
  void requireRole;
  const supabase = await createClient();
  const [{ data: reqs }, { data: profile }] = await Promise.all([
    supabase.from("privacy_requests").select("id, type, status, message, resolution_note, created_at, resolved_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("consent_privacy_at, consent_version").eq("id", user.id).maybeSingle(),
  ]);
  return (
    <div className="page-container max-w-3xl space-y-6">
      <nav className="text-sm"><Link href={homePathFor(user.roles)} className="text-primary underline">← Volver a mi panel</Link></nav>
      <header><h1 className="text-3xl">Privacidad de mis datos</h1>
        <p className="mt-1 text-muted-foreground">Ejerce tus derechos de acceso, rectificación, cancelación y oposición (Ley N.º 29733).</p></header>
      <Card><CardHeader><CardTitle>Consentimiento</CardTitle></CardHeader><CardContent>
        <p>Aceptaste la política de privacidad {profile?.consent_privacy_at ? <>el <strong>{formatDateTime(profile.consent_privacy_at)}</strong> (versión {profile.consent_version})</> : "al registrarte"}. <Link href="/privacidad" className="text-primary underline">Leer política</Link></p></CardContent></Card>
      <Card><CardHeader><CardTitle>Descargar una copia de mis datos</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-muted-foreground">Obtén un archivo JSON con tu perfil, postulaciones, notificaciones y negocios.</p>
        <Button asChild variant="secondary"><a href="/api/privacy/export" download><Download /> Descargar mis datos</a></Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Nueva solicitud</CardTitle></CardHeader><CardContent><PrivacyRequestForm /></CardContent></Card>
      {reqs && reqs.length > 0 && (
        <section><h2 className="mb-3 text-xl">Mis solicitudes</h2>
          <ul className="space-y-2">{reqs.map((r: any) => (
            <li key={r.id} className="rounded-lg border bg-card p-4"><div className="flex flex-wrap items-center gap-2"><strong className="capitalize">{r.type}</strong><StatusBadge status={r.status} /><span className="text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span></div>
              {r.message && <p className="mt-1 text-sm">{r.message}</p>}{r.resolution_note && <p className="mt-1 text-sm text-muted-foreground">Respuesta: {r.resolution_note}</p>}</li>))}</ul>
          <p className="mt-2 text-xs text-muted-foreground">Estados posibles: {["pendiente", "en_proceso", "atendida", "rechazada"].map(label).join(", ")}.</p></section>)}
    </div>
  );
}
