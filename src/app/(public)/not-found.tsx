import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-container flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-4xl">Página no encontrada</h1>
      <p className="text-muted-foreground">Es posible que el enlace haya cambiado o que la oferta ya no esté disponible.</p>
      <Button asChild size="lg"><Link href="/">Volver al inicio</Link></Button>
    </div>
  );
}
