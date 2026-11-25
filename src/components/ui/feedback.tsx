import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", {
  variants: {
    variant: {
      default: "border-transparent bg-primary/10 text-primary",
      secondary: "border-transparent bg-muted text-muted-foreground",
      success: "border-transparent bg-success/10 text-success",
      warning: "border-transparent bg-accent/20 text-[hsl(30_70%_28%)]",
      destructive: "border-transparent bg-destructive/10 text-destructive",
      outline: "text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...p} />;
}

const STATUS_VARIANT: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
  enviada: "secondary", en_revision: "default", preseleccionada: "warning", entrevista: "warning", seleccionada: "success", descartada: "destructive",
  registrado: "secondary", en_orientacion: "default", en_proceso_formalizacion: "default", documentacion_en_revision: "warning", documentacion_verificada: "success", suspendido: "destructive",
  borrador: "secondary", pendiente_moderacion: "warning", activa: "success", cerrada: "secondary", suspendida: "destructive", rechazada: "destructive",
  pendiente: "secondary", en_proceso: "default", completado: "success", no_aplica: "secondary", presentado: "default", aprobado: "success", observado: "warning",
  atendida: "success",
};

import { label } from "@/lib/constants";
export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{label(status)}</Badge>;
}

const alertVariants = cva("flex gap-3 rounded-lg border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-primary/30 bg-primary/5 text-foreground",
      success: "border-success/30 bg-success/5 text-foreground",
      warning: "border-accent/50 bg-accent/10 text-foreground",
      error: "border-destructive/30 bg-destructive/5 text-foreground",
    },
  },
  defaultVariants: { variant: "info" },
});
const ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };
const ICON_COLOR = { info: "text-primary", success: "text-success", warning: "text-[hsl(30_80%_38%)]", error: "text-destructive" };

export function Alert({ variant = "info", title, children, className }: { variant?: "info" | "success" | "warning" | "error"; title?: string; children?: React.ReactNode; className?: string }) {
  const Icon = ICON[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", ICON_COLOR[variant])} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-muted-foreground" : ""}>{children}</div>}
      </div>
    </div>
  );
}

export function Progress({ value, className, label: lbl }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={lbl ?? "Avance"}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      {Icon && <Icon className="size-10 text-muted-foreground" />}
      <p className="text-lg font-semibold">{title}</p>
      {children && <p className="max-w-md text-muted-foreground">{children}</p>}
      {action}
    </div>
  );
}
