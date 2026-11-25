import Link from "next/link";
import type { Metadata } from "next";
import { CONSENT_VERSION } from "@/lib/constants";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  const contact = process.env.NEXT_PUBLIC_PRIVACY_EMAIL;
  return (
    <div className="page-container max-w-3xl space-y-5 [&_h2]:mt-6 [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-3xl">Política de privacidad</h1>
      <p className="text-sm text-muted-foreground">Versión {CONSENT_VERSION}. Marco: Ley N.º 29733, Ley de Protección de Datos Personales, y su reglamento vigente.</p>
      <h2>¿Qué datos tratamos y para qué?</h2>
      <ul>
        <li><strong>Cuenta:</strong> nombre, correo y celular, para identificarte y comunicarnos contigo.</li>
        <li><strong>Perfil laboral:</strong> habilidades, experiencia, disponibilidad y CV, para recomendarte empleos y que las empresas evalúen tu postulación.</li>
        <li><strong>Negocios:</strong> datos comerciales y documentos de verificación, para orientar la formalización y verificar documentos.</li>
        <li><strong>Uso del asistente:</strong> tus consultas al chat se guardan si has iniciado sesión, para mejorar la atención.</li>
      </ul>
      <h2>¿Quién ve mis datos?</h2>
      <ul>
        <li>Las empresas solo ven tu perfil si <strong>postulas</strong> a una de sus ofertas (con tu autorización expresa) o si activas la visibilidad de tu perfil (sin teléfono ni correo).</li>
        <li>Los documentos de tu negocio solo los ven tu negocio y la administración.</li>
        <li>Los archivos se guardan en almacenamiento privado y se entregan mediante enlaces temporales.</li>
        <li>Las funciones de IA envían tu texto a un proveedor de modelos de lenguaje configurado por la plataforma. No escribas datos sensibles en esos campos.</li>
      </ul>
      <h2>Tus derechos (ARCO)</h2>
      <p>Puedes solicitar <strong>acceso, rectificación, cancelación (eliminación) y oposición</strong> desde <Link href="/cuenta/privacidad" className="text-primary underline">Privacidad de mis datos</Link> en tu panel, y descargar una copia de tus datos en formato JSON.</p>
      <h2>Contacto del responsable</h2>
      <p>{contact ? <>Escríbenos a <a className="text-primary underline" href={`mailto:${contact}`}>{contact}</a>.</> : "Datos de contacto del titular del banco de datos: pendiente de configurar por el operador (variable NEXT_PUBLIC_PRIVACY_EMAIL)."}</p>
      <h2>Importante</h2>
      <p>PORVENIR TRABAJA no emite licencias, certificados ni autorizaciones oficiales y no consulta servicios gubernamentales privados. Nunca te pediremos tus credenciales del Estado (por ejemplo, clave SOL).</p>
    </div>
  );
}
