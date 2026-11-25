import Link from "next/link";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { DiagnosticForm } from "@/components/forms/business-forms";
import { requireBusinessPage } from "@/lib/business-page";
import { llmConfigured } from "@/lib/ai/llm";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Diagnóstico de formalización" };

export default async function DiagnosticPage() {
  const { supabase, business } = await requireBusinessPage("/empresa/diagnostico");
  const { data: last } = await supabase.from("formalization_diagnostics").select("answers, created_at").eq("business_id", business.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const defaults = last?.answers ?? { ruc_status: business.ruc_declared, premises: business.premises, workers_count: business.workers_count };
  return (
    <>
      <PageHeader title="IA FORMALIZA · Diagnóstico" description="Responde unas pocas preguntas y generamos tu ruta personalizada de trámites." />
      {last && <Alert variant="info" className="mb-4">Tu último diagnóstico fue el {formatDateTime(last.created_at)}. Puedes actualizarlo cuando cambie tu situación. <Button asChild variant="link" className="px-1"><Link href="/empresa/ruta">Ver mi ruta actual</Link></Button></Alert>}
      <DiagnosticForm defaults={defaults} aiAvailable={llmConfigured()} />
    </>
  );
}
