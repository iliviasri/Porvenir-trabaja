import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { signOutAction } from "@/actions/auth";

export function DashboardShell({ title, subtitle, items, userName, children }: {
  title: string; subtitle: string; items: NavItem[]; userName: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{userName}</span>
            <Button asChild variant="ghost" size="sm"><Link href="/">Ver sitio</Link></Button>
            <form action={signOutAction}><Button variant="outline" size="sm" type="submit">Salir</Button></form>
          </div>
        </div>
      </header>
      <div className="container grid gap-6 py-6 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/70">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <DashboardNav items={items} />
        </aside>
        <main id="contenido" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
