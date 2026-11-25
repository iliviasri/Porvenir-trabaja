"use client";
import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Loader2, Mic, Plus, Square, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/feedback";
import { Feedback, SubmitButton, useRunner } from "@/components/forms/shared";
import { saveCvData } from "@/actions/worker";

interface Exp { role_title: string; company: string; months: number; description: string }
interface Draft { headline: string; summary: string; skills: string[]; experiences: Exp[] }
interface Caps { llm: boolean; transcription: boolean }

export function CvStudio({ initial, caps }: { initial: Draft; caps: Caps }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft>(initial);
  const [source, setSource] = useState<null | "ia" | "palabras_clave">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "extract" | "transcribe">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const { pending, msg, run } = useRunner();

  useEffect(() => () => { recRef.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  async function transcribe(blob: Blob, name: string) {
    setBusy("transcribe"); setError(null);
    try {
      const fd = new FormData();
      fd.set("audio", new File([blob], name, { type: blob.type || "audio/webm" }));
      const res = await fetch("/api/cv/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo transcribir.");
      setText((t) => (t ? t + "\n" : "") + data.text);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al transcribir."); } finally { setBusy(null); }
  }

  async function startRec() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); void transcribe(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }), "grabacion.webm"); };
      rec.start();
      recRef.current = rec; setRecording(true);
      setTimeout(() => rec.state === "recording" && stopRec(), 110_000); // ~2 min (límite de 4 MB)
    } catch { setError("No pudimos acceder al micrófono. Revisa el permiso del navegador o escribe tu experiencia."); }
  }
  function stopRec() { recRef.current?.stop(); setRecording(false); }

  async function extract() {
    setBusy("extract"); setError(null); setNotice(null);
    try {
      const res = await fetch("/api/cv/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo procesar.");
      setSource(data.source); setNotice(data.notice ?? null);
      setDraft((d) => ({
        headline: data.headline || d.headline, summary: data.summary || d.summary,
        skills: [...new Set([...d.skills, ...(data.skills ?? [])])],
        experiences: [...d.experiences, ...(data.experiences ?? [])],
      }));
      setConfirmed(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); } finally { setBusy(null); }
  }

  const setExp = (i: number, patch: Partial<Exp>) => setDraft((d) => ({ ...d, experiences: d.experiences.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="text-xl">1. Cuéntanos tu experiencia</h2>
        <p className="text-muted-foreground">Escribe o graba con tus palabras. Ej.: «He trabajado tres años pegando suelas, cortando cuero y armando zapatos».</p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} className="min-h-[130px]" aria-label="Tu experiencia" />
        <div className="flex flex-wrap items-center gap-3">
          {caps.transcription ? (
            <>
              {!recording ? <Button type="button" variant="outline" onClick={startRec} disabled={!!busy}><Mic /> Grabar audio</Button> : <Button type="button" variant="destructive" onClick={stopRec}><Square /> Detener grabación</Button>}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-card px-4 py-2.5 text-base font-medium hover:bg-muted">
                <FileUp className="size-4" /> Subir audio
                <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void transcribe(f, f.name); e.target.value = ""; }} />
              </label>
            </>
          ) : (
            <Alert variant="info" className="w-full">La <strong>transcripción de voz no está disponible</strong> en este entorno (falta configurar el servicio). Puedes escribir tu experiencia.</Alert>
          )}
          {/* <Button type="button" onClick={extract} disabled={busy !== null || text.trim().length < 10}>
            {busy === "extract" ? <Loader2 className="animate-spin" /> : <Wand2 />} Organizar mis datos
          </Button> */}
        </div>
        {busy === "transcribe" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Transcribiendo audio…</p>}
        {!caps.llm && <p className="text-sm text-muted-foreground">La IA de lenguaje no está configurada: se detectarán habilidades por palabras clave y el resto lo completas tú.</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="warning">{notice}</Alert>}
        {source && <p className="text-sm text-muted-foreground">Origen de la propuesta: {source === "ia" ? "asistente de IA" : "coincidencia por palabras clave (sin IA)"}. Revisa todo antes de guardar.</p>}
      </section>

      <form onSubmit={(e) => { e.preventDefault(); run(() => saveCvData({ ...draft, confirmed })); }} className="space-y-6 rounded-lg border bg-card p-5">
        <h2 className="text-xl">2. Revisa y corrige tus datos</h2>
        <Field label="Título corto" htmlFor="cv_headline"><Input id="cv_headline" value={draft.headline} maxLength={120} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} /></Field>
        <Field label="Resumen" htmlFor="cv_summary"><Textarea id="cv_summary" value={draft.summary} maxLength={1500} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field>
        <Field label="Habilidades (separadas por comas)" htmlFor="cv_skills">
          <Input id="cv_skills" value={draft.skills.join(", ")} onChange={(e) => setDraft({ ...draft, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25) })} />
        </Field>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Experiencias</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, experiences: [...draft.experiences, { role_title: "", company: "", months: 0, description: "" }] })}><Plus /> Agregar</Button></div>
          {draft.experiences.length === 0 && <p className="text-muted-foreground">Aún no hay experiencias. Agrega una o usa «Organizar mis datos».</p>}
          {draft.experiences.map((e, i) => (
            <div key={i} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_130px_auto]">
              <Field label="Cargo o tarea"><Input value={e.role_title} onChange={(ev) => setExp(i, { role_title: ev.target.value })} /></Field>
              <Field label="Empresa (opcional)"><Input value={e.company} onChange={(ev) => setExp(i, { company: ev.target.value })} /></Field>
              <Field label="Meses"><Input type="number" min={0} max={720} value={e.months} onChange={(ev) => setExp(i, { months: Math.max(0, Math.min(720, Number(ev.target.value) || 0)) })} /></Field>
              <Button type="button" variant="ghost" size="icon" className="self-end" aria-label="Quitar experiencia" onClick={() => setDraft({ ...draft, experiences: draft.experiences.filter((_, j) => j !== i) })}><Trash2 /></Button>
              <Field label="¿Qué hacías?" className="sm:col-span-4"><Textarea className="min-h-[60px]" value={e.description} onChange={(ev) => setExp(i, { description: ev.target.value })} /></Field>
            </div>
          ))}
        </div>
        <label className="flex items-start gap-3 rounded-md bg-secondary/60 p-3"><Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>Confirmo que revisé la información y es <strong>verdadera</strong>. Entiendo que el sistema no inventa títulos, experiencia ni certificaciones.</span></label>
        <Feedback msg={msg} />
        <div className="flex flex-wrap gap-3">
          <SubmitButton pending={pending} disabled={!confirmed} size="lg">3. Guardar mi CV</SubmitButton>
          <Button asChild variant="accent" size="lg"><a href="/api/cv/pdf" download><Download /> 4. Descargar CV en PDF</a></Button>
        </div>
        <p className="text-sm text-muted-foreground">Guarda primero para que el PDF incluya tus últimos cambios.</p>
      </form>
    </div>
  );
}

export function CvUpload({ hasCv, cvUserId }: { hasCv: boolean; cvUserId: string }) {
  const { msg, setMsg, router } = useRunner();
  const [busy, setBusy] = useState(false);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.set("kind", "cv"); fd.set("file", f);
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      setMsg(res.ok ? { type: "ok", text: data.message } : { type: "error", text: data.error });
      if (res.ok) router.refresh();
    } catch { setMsg({ type: "error", text: "Error de conexión." }); } finally { setBusy(false); e.target.value = ""; }
  }
  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <h2 className="text-xl">Subir mi propio CV (PDF)</h2>
      <p className="text-muted-foreground">Si ya tienes un CV en PDF, súbelo (máx. 4 MB). Se guarda en un espacio privado; solo lo verán las empresas a las que postules.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:bg-primary/90">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} {hasCv ? "Reemplazar CV" : "Subir CV"}
          <input type="file" accept="application/pdf" className="sr-only" onChange={onChange} disabled={busy} />
        </label>
        {hasCv && <Button asChild variant="outline"><a href={`/api/files/cv/${cvUserId}`} target="_blank" rel="noopener noreferrer"><Download /> Ver mi CV subido</a></Button>}
      </div>
      <Feedback msg={msg} />
    </div>
  );
}
