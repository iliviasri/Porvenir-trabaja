import { ExternalLink, FileBadge2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CUL_URL } from "@/lib/constants";

/** Certificado Único Laboral: solo enlaza al trámite OFICIAL en gob.pe. No se emite, simula ni solicita credenciales. */
export function CulCard({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="border-accent/60 bg-gradient-to-br from-accent/10 to-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileBadge2 className="size-6 text-primary" /> Certificado Único Laboral (CUL)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          El CUL es un documento oficial del Estado peruano que reúne tu información laboral y académica en un solo lugar.
          Te sirve para <strong>postular a empleos con más facilidad</strong> y acreditar tu trayectoria.
          {!compact && " Se tramita directamente en el portal oficial gob.pe, con tus propios datos."}
        </p>
        <Button asChild size="lg" variant="accent">
          <a href={CUL_URL} target="_blank" rel="noopener noreferrer">Obtener Certificado Único Laboral <ExternalLink /></a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Se abrirá el sitio oficial en una nueva pestaña. PORVENIR TRABAJA no emite el CUL, no realiza el trámite por ti y nunca te pedirá tus credenciales del Estado.
        </p>
      </CardContent>
    </Card>
  );
}
