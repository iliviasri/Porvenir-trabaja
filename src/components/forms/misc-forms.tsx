"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { Select, Textarea, Field } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Feedback, SubmitButton, useRunner } from "@/components/forms/shared";
import { createPrivacyRequest, markAllNotificationsRead, markNotificationRead } from "@/actions/account";
import { formatDateTime } from "@/lib/utils";

export function PrivacyRequestForm() {
  const [type, setType] = useState("acceso");
  const [message, setMessage] = useState("");
  const { pending, msg, run } = useRunner();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => createPrivacyRequest({ type, message }), { onOk: () => setMessage("") }); }} className="space-y-3">
      <Field label="¿Qué quieres solicitar?" htmlFor="ptype">
        <Select id="ptype" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="acceso">Acceso: saber qué datos tienen sobre mí</option>
          <option value="rectificacion">Rectificación: corregir mis datos</option>
          <option value="eliminacion">Eliminación: borrar mi cuenta y mis datos</option>
          <option value="oposicion">Oposición: dejar de usar mis datos para un fin</option>
        </Select>
      </Field>
      <Field label="Detalle (opcional)" htmlFor="pmsg"><Textarea id="pmsg" className="min-h-[80px]" maxLength={1500} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      <Feedback msg={msg} />
      <SubmitButton pending={pending}>Enviar solicitud</SubmitButton>
    </form>
  );
}

export interface NotifRow { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

export function NotificationList({ items }: { items: NotifRow[] }) {
  const { pending, run } = useRunner();
  const unread = items.filter((i) => !i.read_at).length;
  return (
    <div className="space-y-3">
      {unread > 0 && <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => markAllNotificationsRead())}><Check /> Marcar todas como leídas ({unread})</Button>}
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id} className={`flex items-start gap-3 rounded-lg border p-4 ${n.read_at ? "bg-card" : "border-primary/40 bg-primary/5"}`}>
            <Bell className={`mt-1 size-5 shrink-0 ${n.read_at ? "text-muted-foreground" : "text-primary"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{n.title}</p>
              {n.body && <p className="text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              <div className="mt-2 flex gap-2">
                {n.link && <Button asChild size="sm" variant="secondary"><Link href={n.link} onClick={() => !n.read_at && run(() => markNotificationRead(n.id), { refresh: false })}>Abrir</Link></Button>}
                {!n.read_at && <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => markNotificationRead(n.id))}>Marcar leída</Button>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
