"use client";
import { useState } from "react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { ActionButton, Feedback, SubmitButton, applyFieldErrors, useRunner } from "@/components/forms/shared";
import { BUSINESS_STATUSES, label } from "@/lib/constants";
import {
  deleteUserData, moderateJob, resolvePrivacyRequest, reviewDocument, saveCategory, saveKnowledge, saveRequirement,
  setBusinessStatus, setUserActive, setUserRole, toggleRequirement, updateMatchConfig, verifyRuc,
} from "@/actions/admin";

export function ModerationControls({ jobId, status }: { jobId: string; status: string }) {
  const [notes, setNotes] = useState("");
  const { pending, msg, run } = useRunner();
  const go = (d: "aprobar" | "rechazar" | "suspender" | "reactivar") => run(() => moderateJob(jobId, d, notes));
  return (
    <div className="space-y-2">
      <Input aria-label="Observaciones de moderación" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observación (obligatoria al rechazar o suspender)" />
      <div className="flex flex-wrap gap-2">
        {(status === "pendiente_moderacion" || status === "rechazada") && <Button size="sm" disabled={pending} onClick={() => go("aprobar")}>Aprobar y publicar</Button>}
        {status === "pendiente_moderacion" && <Button size="sm" variant="destructive" disabled={pending} onClick={() => go("rechazar")}>Rechazar</Button>}
        {status === "activa" && <Button size="sm" variant="destructive" disabled={pending} onClick={() => go("suspender")}>Suspender</Button>}
        {status === "suspendida" && <Button size="sm" disabled={pending} onClick={() => go("reactivar")}>Reactivar</Button>}
      </div>
      <Feedback msg={msg} />
    </div>
  );
}

export function DocReviewControls({ docId }: { docId: string }) {
  const [notes, setNotes] = useState("");
  const { pending, msg, run } = useRunner();
  return (
    <div className="space-y-2">
      <Input aria-label="Observación del documento" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observación (obligatoria si lo observas)" />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => reviewDocument(docId, "aprobado", notes))}>Aprobar</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reviewDocument(docId, "observado", notes))}>Observar</Button>
      </div>
      <Feedback msg={msg} />
    </div>
  );
}

export function BusinessStatusControls({ businessId, status, hasRuc, rucVerified }: { businessId: string; status: string; hasRuc: boolean; rucVerified: boolean }) {
  const [s, setS] = useState(status);
  const [notes, setNotes] = useState("");
  const [src, setSrc] = useState("");
  const { pending, msg, run } = useRunner();
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); run(() => setBusinessStatus(businessId, s, notes)); }} className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
        <Select aria-label="Estado del negocio" value={s} onChange={(e) => setS(e.target.value)}>{BUSINESS_STATUSES.map((b) => <option key={b} value={b}>{label(b)}</option>)}</Select>
        <Input aria-label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones (obligatorias para verificar o suspender)" />
        <SubmitButton pending={pending} variant="secondary">Aplicar</SubmitButton>
      </form>
      {hasRuc && !rucVerified && (
        <form onSubmit={(e) => { e.preventDefault(); run(() => verifyRuc(businessId, src)); }} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input aria-label="Fuente de verificación del RUC" value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Fuente de verificación del RUC (ej. constancia SUNAT revisada el …)" />
          <SubmitButton pending={pending} variant="outline">Marcar RUC verificado</SubmitButton>
        </form>
      )}
      <Feedback msg={msg} />
    </div>
  );
}

export function UserControls({ userId, active, roles, isSelf }: { userId: string; active: boolean; roles: string[]; isSelf: boolean }) {
  const hasAdmin = roles.includes("admin");
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ActionButton action={() => setUserActive(userId, !active)} confirm={active ? "¿Desactivar esta cuenta? No podrá ingresar." : undefined} variant={active ? "outline" : "default"}>{active ? "Desactivar" : "Activar"}</ActionButton>
      <ActionButton action={() => setUserRole(userId, "admin", !hasAdmin)} confirm={hasAdmin ? "¿Quitar rol de administrador?" : "¿Conceder rol de administrador a este usuario?"} variant="ghost">{hasAdmin ? "Quitar admin" : "Hacer admin"}</ActionButton>
      {!isSelf && !hasAdmin && <ActionButton action={() => deleteUserData(userId)} confirm="Esto ELIMINA la cuenta y todos sus datos de forma permanente. ¿Continuar?" variant="destructive">Eliminar datos</ActionButton>}
    </div>
  );
}

export function PrivacyResolveControls({ id, userId, type }: { id: string; userId: string; type: string }) {
  const [note, setNote] = useState("");
  const { pending, msg, run } = useRunner();
  return (
    <div className="space-y-2">
      <Input aria-label="Nota de resolución" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota para el usuario" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resolvePrivacyRequest(id, "en_proceso", note))}>En proceso</Button>
        <Button size="sm" disabled={pending} onClick={() => run(() => resolvePrivacyRequest(id, "atendida", note))}>Marcar atendida</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolvePrivacyRequest(id, "rechazada", note))}>Rechazar</Button>
        {type === "eliminacion" && <ActionButton action={async () => { const r = await deleteUserData(userId, id); if (r.ok) await resolvePrivacyRequest(id, "atendida", "Datos eliminados."); return r; }} confirm="Se eliminará la cuenta y sus datos de forma permanente. ¿Continuar?" variant="destructive">Ejecutar eliminación</ActionButton>}
      </div>
      <Feedback msg={msg} />
    </div>
  );
}

export interface ReqDefaults { id?: string; code: string; category: string; title: string; summary: string; plain_explanation: string; documents: string; applies_when: string; caveats: string; source_label: string; source_url: string; sort_order: number; active: boolean }

export function RequirementForm({ defaults, onDone }: { defaults: ReqDefaults; onDone?: () => void }) {
  const [v, setV] = useState(defaults);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { pending, msg, run } = useRunner();
  const set = (k: keyof ReqDefaults, val: string | number | boolean) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); setErrs({}); run(() => saveRequirement(v), { onOk: () => onDone?.(), onError: (r) => setErrs((r as any).fieldErrors ?? {}) }); }} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Código" error={errs.code}><Input value={v.code} disabled={!!v.id} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="EJEMPLO_TRAMITE" /></Field>
        <Field label="Categoría"><Select value={v.category} onChange={(e) => set("category", e.target.value)}>{["tributaria", "municipal", "laboral", "otra"].map((c) => <option key={c} value={c}>{label(c)}</option>)}</Select></Field>
        <Field label="Orden"><Input type="number" value={v.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
      </div>
      <Field label="Título" error={errs.title}><Input value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Resumen" error={errs.summary}><Input value={v.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
      <Field label="Explicación en lenguaje sencillo" error={errs.plain_explanation}><Textarea value={v.plain_explanation} onChange={(e) => set("plain_explanation", e.target.value)} /></Field>
      <Field label="Documentos (uno por línea)"><Textarea className="min-h-[70px]" value={v.documents} onChange={(e) => set("documents", e.target.value)} /></Field>
      <Field label="Regla de aplicación (JSON)" error={errs.applies_when} hint='Vacío = aplica siempre. Ej.: {"all":[{"field":"workers_count","op":"gte","value":1}]}. Campos: ruc_status, premises, workers_count, wants_hire, sells_to_businesses, has_municipal_license.'>
        <Textarea className="min-h-[80px] font-mono text-sm" value={v.applies_when} onChange={(e) => set("applies_when", e.target.value)} />
      </Field>
      <Field label="Advertencias / límites (opcional)"><Input value={v.caveats} onChange={(e) => set("caveats", e.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fuente oficial (nombre)" error={errs.source_label}><Input value={v.source_label} onChange={(e) => set("source_label", e.target.value)} /></Field>
        <Field label="URL de la fuente (https)" error={errs.source_url}><Input value={v.source_url} onChange={(e) => set("source_url", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2"><Checkbox className="mt-0" checked={v.active} onChange={(e) => set("active", e.target.checked)} /> Vigente</label>
      <Feedback msg={msg} />
      <SubmitButton pending={pending}>{v.id ? "Guardar como nueva versión" : "Crear requisito"}</SubmitButton>
    </form>
  );
}

export function ToggleRequirementButton({ id, active }: { id: string; active: boolean }) {
  return <ActionButton action={() => toggleRequirement(id, !active)} variant="ghost">{active ? "Desactivar" : "Activar"}</ActionButton>;
}

export interface KnowledgeDefaults { id?: string; title: string; content: string; category: string; url: string; is_official: boolean; active: boolean }

export function KnowledgeForm({ defaults }: { defaults: KnowledgeDefaults }) {
  const [v, setV] = useState(defaults);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { pending, msg, run } = useRunner();
  const set = (k: keyof KnowledgeDefaults, val: string | boolean) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); setErrs({}); run(() => saveKnowledge(v), { onOk: () => !v.id && setV(defaults), onError: (r) => setErrs((r as any).fieldErrors ?? {}) }); }} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Field label="Título" error={errs.title}><Input value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Categoría"><Select value={v.category} onChange={(e) => set("category", e.target.value)}>{["plataforma", "empleo", "formalizacion", "laboral", "privacidad", "otro"].map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
      </div>
      <Field label="Contenido" error={errs.content}><Textarea value={v.content} onChange={(e) => set("content", e.target.value)} /></Field>
      <Field label="URL de la fuente (https, opcional)" error={errs.url}><Input value={v.url} onChange={(e) => set("url", e.target.value)} /></Field>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2"><Checkbox className="mt-0" checked={v.is_official} onChange={(e) => set("is_official", e.target.checked)} /> Fuente oficial</label>
        <label className="flex items-center gap-2"><Checkbox className="mt-0" checked={v.active} onChange={(e) => set("active", e.target.checked)} /> Activa</label>
      </div>
      <Feedback msg={msg} />
      <SubmitButton pending={pending}>{v.id ? "Guardar fuente" : "Agregar fuente"}</SubmitButton>
    </form>
  );
}

export function CategoryForm({ id, name, sort, active }: { id?: string; name: string; sort: number; active: boolean }) {
  const [n, setN] = useState(name);
  const [s, setS] = useState(sort);
  const [a, setA] = useState(active);
  const { pending, msg, run } = useRunner();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveCategory(n, s, a, id), { onOk: () => !id && setN("") }); }} className="flex flex-wrap items-end gap-3">
      <Field label={id ? "Nombre" : "Nueva categoría"} className="min-w-[200px] flex-1"><Input value={n} onChange={(e) => setN(e.target.value)} /></Field>
      <Field label="Orden" className="w-24"><Input type="number" value={s} onChange={(e) => setS(Number(e.target.value))} /></Field>
      <label className="flex items-center gap-2 pb-3"><Checkbox className="mt-0" checked={a} onChange={(e) => setA(e.target.checked)} /> Activa</label>
      <SubmitButton pending={pending} variant="secondary">{id ? "Guardar" : "Crear"}</SubmitButton>
      {msg && <div className="w-full"><Feedback msg={msg} /></div>}
    </form>
  );
}

export function MatchConfigForm({ weights }: { weights: Record<string, number> }) {
  const [w, setW] = useState(weights);
  const { pending, msg, run } = useRunner();
  const rows: [string, string][] = [["skills", "Habilidades"], ["experience", "Experiencia"], ["availability", "Disponibilidad y horario"], ["location_modality", "Ubicación y modalidad"], ["preferences", "Preferencias"]];
  const total = Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => updateMatchConfig(w)); }} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-5">
        {rows.map(([k, l]) => (
          <Field key={k} label={l} hint={`${Math.round(((Number(w[k]) || 0) / total) * 100)} % efectivo`}><Input type="number" min={0} max={100} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} /></Field>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Las ponderaciones se normalizan automáticamente. No existen criterios sensibles (edad, sexo, nacionalidad, etc.).</p>
      <Feedback msg={msg} />
      <SubmitButton pending={pending}>Guardar ponderaciones</SubmitButton>
    </form>
  );
}
