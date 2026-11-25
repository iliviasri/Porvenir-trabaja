import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/auth-forms";
import { getCurrentUser, homePathFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user && user.isActive) redirect(sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : homePathFor(user.roles));
  return (
    <div className="container flex justify-center py-12">
      <Card className="w-full max-w-md"><CardHeader><CardTitle className="text-2xl">Ingresar a tu cuenta</CardTitle></CardHeader>
        <CardContent><LoginForm next={sp.next} error={sp.error} /></CardContent></Card>
    </div>
  );
}
