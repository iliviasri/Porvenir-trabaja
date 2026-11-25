import { BadgeCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { VERIFICATION_DISCLAIMER } from "@/lib/constants";

export function VerificationBadge({ status }: { status: string }) {
  if (status === "documentacion_verificada") {
    return <Badge variant="success" title={VERIFICATION_DISCLAIMER}><BadgeCheck className="mr-1 size-3.5" /> Documentación verificada por la plataforma</Badge>;
  }
  return <Badge variant="secondary"><ShieldQuestion className="mr-1 size-3.5" /> Sin verificación documental</Badge>;
}

export function VerificationDisclaimer({ className }: { className?: string }) {
  return <p className={className ?? "text-xs text-muted-foreground"}>{VERIFICATION_DISCLAIMER}</p>;
}
