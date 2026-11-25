"use client";
import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Textarea } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/feedback";
import { Feedback, useRunner } from "@/components/forms/shared";
import { applyToJob, toggleSaveJob } from "@/actions/worker";
import { updateApplicationStatus } from "@/actions/jobs";
import { Select } from "@/components/ui/form-controls";
import { APPLICATION_STATUSES, label } from "@/lib/constants";

export function SaveJobButton({ jobId, saved }: { jobId: string; saved: boolean }) {
  const { pending, run } = useRunner();
  const [s, setS] = useState(saved);
  return (
    <Button type="button" variant="outline" disabled={pending} aria-pressed={s} onClick={() => run(() => toggleSaveJob(jobId), { onOk: (r) => setS(!!r.data?.saved) })}>
      {pending ? <Loader2 className="animate-spin" /> : s ? <BookmarkCheck /> : <Bookmark />} {s ? "Guardada" : "Guardar oferta"}
    </Button>
  );
}

export function ApplyForm({ jobId, alreadyApplied, hasProfile }: { jobId: string; alreadyApplied: boolean; hasProfile: boolean }) {
  const { pending, msg, run } = useRunner();
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(alreadyApplied);
  if (done) return <Alert variant="success" title="Ya postulaste a esta oferta">Puedes seguir el estado en «Mis postulaciones».</Alert>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => applyToJob({ job_id: jobId, cover_note: note, consent }), { onOk: () => setDone(true) }); }} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-lg font-semibold">Postular a esta oferta</h3>
      {!hasProfile && <Alert variant="warning">Completa tu perfil (habilidades y experiencia) para que la empresa te conozca mejor.</Alert>}
      <label className="block text-sm font-medium" htmlFor="cover_note">Mensaje para la empresa (opcional)</label>
      <Textarea id="cover_note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="min-h-[80px]" />
      <label className="flex items-start gap-3 text-sm"><Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Autorizo que esta empresa vea mi perfil laboral y mis datos de contacto para evaluar mi postulación.</span></label>
      <Feedback msg={msg} />
      <Button type="submit" size="lg" disabled={pending || !consent}>{pending ? <Loader2 className="animate-spin" /> : <Send />} Enviar postulación</Button>
    </form>
  );
}

export function ApplicationStatusSelect({ applicationId, status }: { applicationId: string; status: string }) {
  const { pending, msg, run } = useRunner();
  return (
    <div className="space-y-1">
      <label className="sr-only" htmlFor={`as-${applicationId}`}>Estado de la postulación</label>
      <Select id={`as-${applicationId}`} defaultValue={status} disabled={pending} className="h-10 min-w-[170px]"
        onChange={(e) => run(() => updateApplicationStatus({ application_id: applicationId, status: e.target.value }))}>
        {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
      </Select>
      {msg && <p role="status" className={msg.type === "ok" ? "text-xs text-success" : "text-xs text-destructive"}>{msg.text}</p>}
    </div>
  );
}
