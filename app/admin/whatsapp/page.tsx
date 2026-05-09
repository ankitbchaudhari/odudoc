"use client";

// Staff WhatsApp inbox.
//
// Left rail: every conversation belonging to the active org, sorted
// by most-recent activity, unread badge per row.
// Right pane: the selected conversation thread, with the staff reply
// composer at the bottom + a "send template" picker for outbound.

import { useCallback, useEffect, useMemo, useState } from "react";

interface Message {
  id: string; direction: "outbound" | "inbound";
  body: string; templateName?: string; intent?: string;
  status?: string; staffEmail?: string; createdAt: string;
}
interface Conversation {
  id: string; patientUserId: string; organizationId: string;
  patientPhone: string; patientName: string;
  optInStatus: string; lastOutboundTemplate?: string; lastOutboundAt?: string;
  unreadByStaff: number; unreadByPatient: number;
  messages: Message[]; updatedAt: string;
}
interface Template {
  name: string; label: string; category: string;
  variables: string[]; body: string;
}

const STATUS_COLOR: Record<string, string> = {
  queued: "text-slate-400",
  sent: "text-slate-500",
  delivered: "text-sky-600",
  read: "text-emerald-600",
  failed: "text-rose-600",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function AdminWhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);
  const [tName, setTName] = useState("");
  const [tVars, setTVars] = useState<Record<string, string>>({});
  const [recipient, setRecipient] = useState("");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/whatsapp/conversations", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setConversations(d.conversations || []);
      setTemplates(d.templates || []);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

  // When a conversation opens we GET it (which marks it read server-side).
  useEffect(() => {
    if (!activeId) return;
    fetch(`/api/whatsapp/conversations/${activeId}`).then(() => load());
  }, [activeId, load]);

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    const r = await fetch(`/api/whatsapp/conversations/${active.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    if (r.ok) { setReply(""); await load(); }
    else { setToast({ kind: "err", text: "Send failed." }); }
  };

  const sendTemplate = async () => {
    if (!recipient || !tName) return;
    const r = await fetch("/api/whatsapp/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientUserId: recipient, templateName: tName, vars: tVars }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Template message sent." });
      setShowTemplate(false); setTVars({}); setTName(""); setRecipient("");
      await load();
    } else {
      const body = await r.json().catch(() => ({}));
      setToast({ kind: "err", text: `Send failed: ${body.error || "unknown"}` });
    }
  };

  const tmpl = templates.find((t) => t.name === tName);

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">WhatsApp inbox</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Two-way conversations. Inbound replies are auto-classified and the bot responds — staff can take over any thread by sending a manual reply.
          </p>
        </div>
        <button onClick={() => setShowTemplate(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">+ Send template</button>
      </div>

      <div className="grid h-[70vh] gap-3 overflow-hidden lg:grid-cols-[300px_1fr]">
        {/* Left rail — conversation list */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
          </p>
          <div className="overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No conversations yet. Send a templated message to start one.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full border-b border-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${activeId === c.id ? "bg-indigo-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="truncate font-semibold text-slate-900">{c.patientName}</p>
                    {c.unreadByStaff > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unreadByStaff}</span>}
                  </div>
                  <p className="truncate text-xs text-slate-500">{c.messages[c.messages.length - 1]?.body || "(no messages)"}</p>
                  <p className="text-[10px] text-slate-400">{timeAgo(c.updatedAt)} · {c.optInStatus.replace("_", " ")}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right pane — thread + composer */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
          {!active ? (
            <p className="m-auto text-sm text-slate-400">Select a conversation to view the thread.</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <div>
                  <p className="font-semibold text-slate-900">{active.patientName}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{active.patientPhone}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${active.optInStatus === "opted_in" ? "bg-emerald-100 text-emerald-700" : active.optInStatus === "opted_out" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                  {active.optInStatus.replace("_", " ")}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-3">
                {active.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.direction === "outbound" ? "bg-emerald-100 text-emerald-900" : "bg-white text-slate-800"}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                        {timeAgo(m.createdAt)}
                        {m.templateName && <span className="rounded bg-indigo-100 px-1 py-0.5 font-bold text-indigo-700">{m.templateName}</span>}
                        {m.intent && <span className="rounded bg-amber-100 px-1 py-0.5 font-bold text-amber-700">→ {m.intent}</span>}
                        {m.status && <span className={STATUS_COLOR[m.status] || ""}>· {m.status}</span>}
                        {m.staffEmail && <span>· {m.staffEmail}</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {active.messages.length === 0 && <p className="text-center text-xs text-slate-400">No messages yet.</p>}
              </div>
              <div className="border-t border-slate-100 p-3">
                <div className="flex gap-2">
                  <input
                    type="text" value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                    placeholder="Type a reply… (24h customer-service window applies for free-form WhatsApp)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button onClick={sendReply} disabled={!reply.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Template send dialog */}
      {showTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTemplate(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Send template message</h3>
            <p className="mt-1 text-xs text-slate-500">
              Templates are pre-approved by Meta. Free-form messages can only be sent inside the 24h reply window after the patient&apos;s last inbound message.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Patient user id</label>
                <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="user-..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Template</label>
                <select value={tName} onChange={(e) => { setTName(e.target.value); setTVars({}); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Pick a template…</option>
                  {templates.map((t) => <option key={t.name} value={t.name}>{t.label} ({t.category})</option>)}
                </select>
              </div>
              {tmpl && (
                <>
                  <div className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                    <p className="mb-1 font-bold uppercase tracking-wider text-slate-500">Body preview</p>
                    <p className="whitespace-pre-wrap">{tmpl.body}</p>
                  </div>
                  {tmpl.variables.map((v) => (
                    <div key={v}>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{v}</label>
                      <input value={tVars[v] || ""} onChange={(e) => setTVars({ ...tVars, [v]: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowTemplate(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={sendTemplate} disabled={!recipient || !tName} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
