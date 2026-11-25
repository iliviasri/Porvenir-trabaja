import Link from "next/link";
import type { Metadata } from "next";
import { FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CulCard } from "@/components/shared/cul-card";

export const metadata: Metadata = { title: "Servicios laborales · Certificado Único Laboral" };

export default function ServicesPage() {
  return (
    <div className="page-container max-w-4xl space-y-6">
      <header className="space-y-2"><h1 className="text-3xl">Servicios laborales</h1><p className="text-lg text-muted-foreground">Herramientas y trámites para mejorar tus posibilidades de conseguir empleo.</p></header>
      <CulCard />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> CV Inteligente</CardTitle></CardHeader>
          <CardContent className="space-y-3"><p className="text-muted-foreground">Cuenta tu experiencia con tu voz o escribiendo, revisa los datos y descarga tu CV en PDF.</p><Button asChild variant="secondary"><Link href="/trabajador/cv">Crear mi CV</Link></Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="size-5 text-primary" /> Buscar empleo</CardTitle></CardHeader>
          <CardContent className="space-y-3"><p className="text-muted-foreground">Ofertas locales, con filtros y compatibilidad explicada según tu perfil.</p><Button asChild variant="secondary"><Link href="/empleos">Ver ofertas</Link></Button></CardContent></Card>
      </div>
    </div>
  );
}
