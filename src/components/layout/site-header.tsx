import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { signOutAction } from "@/actions/auth";

export const PUBLIC_NAV = [
  { href: "/empleos", label: "Buscar empleo" },
  { href: "/empresas", label: "Empresas" },
  { href: "/formaliza", label: "Formaliza tu negocio" },
  { href: "/servicios", label: "Servicios laborales (CUL)" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-[0.95rem] font-medium hover:bg-muted">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Button asChild variant="secondary"><Link href={homePathFor(user.roles)}>Mi panel</Link></Button>
              <form action={signOutAction}><Button variant="ghost" type="submit">Salir</Button></form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost"><Link href="/login">Ingresar</Link></Button>
              <Button asChild><Link href="/registro">Crear cuenta</Link></Button>
            </>
          )}
        </div>
        {/* Menú móvil sin JavaScript */}
        <details className="group relative lg:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border" aria-label="Abrir menú">
            <Menu className="size-5" />
          </summary>
          <div className="absolute right-0 mt-2 w-72 rounded-lg border bg-card p-3 shadow-lg">
            <nav aria-label="Principal móvil" className="flex flex-col">
              {PUBLIC_NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-3 font-medium hover:bg-muted">{n.label}</Link>
              ))}
            </nav>
            <div className="mt-2 flex flex-col gap-2 border-t pt-3">
              {user ? (
                <>
                  <Button asChild variant="secondary"><Link href={homePathFor(user.roles)}>Mi panel</Link></Button>
                  <form action={signOutAction}><Button variant="outline" type="submit" className="w-full">Salir</Button></form>
                </>
              ) : (
                <>
                  <Button asChild variant="outline"><Link href="/login">Ingresar</Link></Button>
                  <Button asChild><Link href="/registro">Crear cuenta</Link></Button>
                </>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
