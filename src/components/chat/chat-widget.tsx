"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ExternalLink, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Source { title: string; url: string | null; updated_on: string; official: boolean }
interface Suggestion { label: string; href: string }
interface Msg { role: "user" | "assistant"; content: string; sources?: Source[]; suggestions?: Suggestion[] }

const WELCOME: Msg = {
  role: "assistant",
  content: "¡Hola! Soy el asistente de PORVENIR TRABAJA. Puedo ayudarte a buscar empleo, armar tu CV, postular o entender cómo formalizar tu negocio. ¿Qué necesitas?",
};

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | undefined>();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const history = messages.filter((m) => m !== WELCOME).slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history, page: pathname, conversation_id: convId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo responder.");
      setNotice(data.notice ?? null);
      if (data.conversation_id) setConvId(data.conversation_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply, sources: data.sources, suggestions: data.suggestions }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : "Ocurrió un error. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-foreground shadow-lg hover:brightness-95"
          aria-label="Abrir asistente de ayuda"
        >
          <MessageCircle className="size-5" /> <span className="hidden sm:inline">Ayuda</span>
        </button>
      )}
      {open && (
        <section role="dialog" aria-label="Asistente de PORVENIR TRABAJA" className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[390px]">
          <header className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2"><Bot className="size-5" /><p className="font-semibold">Asistente PORVENIR</p></div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar asistente" className="rounded p-1 hover:bg-white/10"><X className="size-5" /></button>
          </header>
          {notice && <p className="border-b bg-accent/15 px-4 py-2 text-xs">{notice}</p>}
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground" : "max-w-[92%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2"}>
                  <p className="whitespace-pre-wrap text-[0.95rem]">{m.content}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 border-t pt-2 text-xs">
                      <p className="font-semibold">Fuentes:</p>
                      <ul className="mt-1 space-y-1">
                        {m.sources.map((s, j) => (
                          <li key={j}>
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                                {s.title} <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <span>{s.title}</span>
                            )}
                            <span className="text-muted-foreground"> · actualizado {formatDate(s.updated_on)}{s.official ? " · oficial" : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.suggestions.map((s) => (
                        <Button key={s.href} asChild size="sm" variant="outline"><Link href={s.href} onClick={() => setOpen(false)}>Abrir: {s.label}</Link></Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Escribiendo…</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <label htmlFor="chat-input" className="sr-only">Escribe tu consulta</label>
            <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder="Escribe tu consulta…" className="h-11 min-w-0 flex-1 rounded-md border border-input px-3" autoComplete="off" />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Enviar"><Send className="size-4" /></Button>
          </form>
          <p className="px-4 pb-3 text-[11px] leading-tight text-muted-foreground">
            No compartas contraseñas ni claves. El asistente orienta; no emite licencias ni realiza trámites por ti.
          </p>
        </section>
      )}
    </>
  );
}
