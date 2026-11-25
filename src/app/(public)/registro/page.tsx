import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/forms/auth-forms";
import { getCurrentUser, homePathFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.roles));
  const role = sp.rol === "worker" || sp.rol === "business" ? sp.rol : undefined;
  return (
    <div className="container flex justify-center py-12">
      <Card className="w-full max-w-lg"><CardHeader><CardTitle className="text-2xl">Crea tu cuenta gratis</CardTitle></CardHeader>
        <CardContent><RegisterForm defaultRole={role} /></CardContent></Card>
    </div>
  );
}
