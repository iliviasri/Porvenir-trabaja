"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem { href: string; label: string; badge?: number }

export function DashboardNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const isActive = (href: string) => (items.some((i) => i.href !== href && i.href.startsWith(href + "/")) ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label="Panel" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isActive(i.href) ? "page" : undefined}
          className={cn(
            "flex items-center justify-between gap-2 whitespace-nowrap rounded-md border px-3 py-2.5 text-[0.95rem] font-medium lg:border-transparent",
            isActive(i.href) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted lg:bg-transparent",
          )}
        >
          {i.label}
          {!!i.badge && <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{i.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
