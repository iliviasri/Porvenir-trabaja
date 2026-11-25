import Link from "next/link";
import { Logo } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="container grid gap-8 py-10 md:grid-cols-3">
        <div className="space-y-3">
          <Logo inverted />
          <p className="max-w-xs text-sm text-primary-foreground/80">
            Empleo local y orientación para formalizar negocios en El Porvenir, Trujillo.
          </p>
        </div>
        <nav aria-label="Enlaces" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/empleos" className="hover:underline">Buscar empleo</Link>
          <Link href="/empresas" className="hover:underline">Directorio de empresas</Link>
          <Link href="/formaliza" className="hover:underline">Formaliza tu negocio</Link>
          <Link href="/servicios" className="hover:underline">Certificado Único Laboral</Link>
          <Link href="/privacidad" className="hover:underline">Política de privacidad</Link>
          <Link href="/login" className="hover:underline">Ingresar</Link>
        </nav>
        <p className="text-xs leading-relaxed text-primary-foreground/70">
          PORVENIR TRABAJA es una plataforma privada de orientación e intermediación. No emite licencias, certificados ni autorizaciones oficiales,
          ni representa a SUNAT, al MTPE ni a la municipalidad. La verificación interna de documentos no equivale a una autorización del Estado.
        </p>
      </div>
    </footer>
  );
}
