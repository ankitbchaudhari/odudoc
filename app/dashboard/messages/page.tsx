"use client";

// Patient WhatsApp inbox.
//
// Read-only view of every conversation across orgs that have messaged
// the patient. Each row shows the org, last message, and quick opt-out.
// Patients reply through their actual WhatsApp app — we don't host
// a separate UI for that since the platform is the conversation, not
// us.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Message { id: string; direction: string; body: string; createdAt: string; templateName?: string; intent?: string }
interface Conversation {
  id: string; organizationId: string; orgName: string;
  patientPhone: string; optInStatus: string; unreadByPatient: number;
  messages: Message[]; updatedAt: string;
}

export default function MessagesPage() {
  const [list, setList] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/whatsapp/inbox", { cache: "no-store" });
      if (r.ok) setList((await r.json()).conversations || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const optOut = async (c: Conversation) => {
    if (!confirm(`Stop receiving WhatsApp messages from ${c.orgName}? You can opt back in any time.`)) return;
    const r = await fetch("/api/whatsapp/opt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: c.organizationId, action: "opt_out" }),
    });
    if (r.ok) { setToast({ kind: "ok", text: `Opted out of ${c.orgName} messages.` }); await load(); }
    else { setToast({ kind: "err", text: "Opt-out failed." }); }
  };

  const optIn = async (c: Conversation) => {
    const r = await fetch("/api/whatsapp/opt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: c.organizationId, action: "opt_in" }),
    });
    if (r.ok) { setToast({ kind: "ok", text: `Opted in to ${c.orgName} messages.` }); await load(); }
    else { setToast({ kind: "err", text: "Opt-in failed." }); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          WhatsApp conversations with hospitals and clinics that have you in their system. Reply on WhatsApp itself — your reply lands here automatically.
        </p>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-3xl">💬</p>
          <p className="mt-2 text-sm font-bold text-slate-700">No conversations yet</p>
          <p className="mt-1 text-xs text-slate-500">Once a clinic sends you a reminder, lab result, or follow-up via WhatsApp, the thread will appear here.</p>
        </div>
      ) : !active ? (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setActive(c)} className="flex-1 text-left">
                  <p className="font-semibold text-slate-900">
                    {c.orgName}
                    {c.unreadByPatient > 0 && <span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unreadByPatient}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{c.messages[c.messages.length - 1]?.body || "(no messages)"}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{new Date(c.updatedAt).toLocaleString()}</p>
                </button>
                <div className="flex flex-col gap-1">
                  {c.optInStatus === "opted_in" ? (
                    <button onClick={() => optOut(c)} className="rounded-md border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Opt out</button>
                  ) : c.optInStatus === "opted_out" ? (
                    <button onClick={() => optIn(c)} className="rounded-md border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">Opt back in</button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setActive(null)} className="text-sm text-indigo-600 hover:underline">← Back</button>
            <p className="font-semibold text-slate-900">{active.orgName}</p>
            <span className="text-[11px] font-mono text-slate-400">{active.patientPhone}</span>
          </div>
          <div className="space-y-2 rounded-lg bg-slate-50 p-4">
            {active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.direction === "outbound" ? "bg-white text-slate-800" : "bg-emerald-100 text-emerald-900"}`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {new Date(m.createdAt).toLocaleString()}
                    {m.templateName && <span className="ml-1 rounded bg-indigo-100 px-1 py-0.5 font-bold text-indigo-700">{m.templateName}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            To reply, open WhatsApp on your phone — your message lands back here automatically.
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-500">
        WhatsApp opt-ins live in your <Link href="/dashboard/privacy" className="text-indigo-600 underline">Privacy & Consent</Link> vault and can be revoked from there or here.
      </p>
    </div>
  );
}
