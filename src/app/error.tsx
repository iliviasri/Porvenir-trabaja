"use client";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-3xl">Algo salió mal</h1>
      <p className="max-w-md text-muted-foreground">Tuvimos un problema al cargar esta página. Inténtalo de nuevo; si continúa, avísanos con este código: {error.digest ?? "sin código"}.</p>
      <Button onClick={reset} size="lg">Reintentar</Button>
    </div>
  );
}
