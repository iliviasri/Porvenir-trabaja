import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border border-input bg-card px-3 text-base placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = "text", ...p }, ref) => (
  <input ref={ref} type={type} className={cn(field, "h-11", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-[110px] py-2", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(field, "h-11 pr-8", className)} {...p}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...p} />;
}

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} type="checkbox" className={cn("mt-1 h-5 w-5 shrink-0 rounded border-input accent-[hsl(var(--primary))]", className)} {...p} />
));
Checkbox.displayName = "Checkbox";

/** Campo con etiqueta, ayuda y mensaje de error accesible. */
export function Field({ label, htmlFor, error, hint, children, className }: {
  label: string; htmlFor?: string; error?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
