"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionResult } from "@/lib/auth";

export type Msg = { type: "ok" | "error"; text: string } | null;

export function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <Alert variant={msg.type === "ok" ? "success" : "error"}>{msg.text}</Alert>;
}

/** Ejecuta una Server Action con estado de carga, mensaje de éxito/error y refresco de datos. */
export function useRunner() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const router = useRouter();
  function run<T>(fn: () => Promise<ActionResult<T>>, opts: { onOk?: (r: Extract<ActionResult<T>, { ok: true }>) => void; onError?: (r: Extract<ActionResult<T>, { ok: false }>) => void; refresh?: boolean } = {}) {
    setMsg(null);
    start(async () => {
      try {
        const r = await fn();
        if (r.ok) {
          setMsg({ type: "ok", text: r.message ?? "Listo." });
          opts.onOk?.(r);
          if (opts.refresh !== false) router.refresh();
        } else {
          setMsg({ type: "error", text: r.error });
          opts.onError?.(r);
        }
      } catch {
        setMsg({ type: "error", text: "Ocurrió un error inesperado. Inténtalo de nuevo." });
      }
    });
  }
  return { pending, msg, setMsg, run, router };
}

export function SubmitButton({ pending, children, ...p }: ButtonProps & { pending?: boolean }) {
  return (
    <Button type="submit" disabled={pending || p.disabled} {...p}>
      {pending && <Loader2 className="animate-spin" />} {children}
    </Button>
  );
}

/** Botón que ejecuta una acción del servidor (con confirmación opcional) y muestra el resultado. */
export function ActionButton({ action, children, confirm, variant = "outline", size = "sm", showMessage = true, className }: {
  action: () => Promise<ActionResult<any>>; children: React.ReactNode; confirm?: string;
  variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; showMessage?: boolean; className?: string;
}) {
  const { pending, msg, run } = useRunner();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" variant={variant} size={size} className={className} disabled={pending} onClick={() => { if (!confirm || window.confirm(confirm)) run(action); }}>
        {pending && <Loader2 className="animate-spin" />} {children}
      </Button>
      {showMessage && msg && <span role="status" className={msg.type === "ok" ? "text-xs text-success" : "text-xs text-destructive"}>{msg.text}</span>}
    </span>
  );
}

export function applyFieldErrors(
  r: { fieldErrors?: Record<string, string> },
  setError: (name: any, error: { message: string }) => void,
) {
  for (const [k, v] of Object.entries(r.fieldErrors ?? {})) setError(k, { message: v });
}
