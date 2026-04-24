"use client";

import { useEffect, useState } from "react";
import type { Notification, Channel, NotificationStatus, Category } from "@/lib/hospital/notifications-store";

// Inlined from notifications-store — see documents/page.tsx comment for why.
const CHANNEL_LABEL: Record<Channel, string> = { sms: "SMS", email: "Email", whatsapp: "WhatsApp", push: "Push", in_app: "In-app", voice: "Voice" };
const STATUS_LABEL: Record<NotificationStatus, string> = { queued: "Queued", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed", bounced: "Bounced" };
const CATEGORY_LABEL: Record<Category, string> = { appointment: "Appointment", reminder: "Reminder", result: "Result", billing: "Billing", marketing: "Marketing", alert: "Alert", discharge: "Discharge", vaccination: "Vaccination", generic: "Generic" };

const CHANNELS: Channel[] = ["sms", "email", "whatsapp", "push", "in_app", "voice"];
const STATUSES: NotificationStatus[] = ["queued", "sent", "delivered", "read", "failed", "bounced"];
const CATEGORIES: Category[] = ["appointment", "reminder", "result", "billing", "marketing", "alert", "discharge", "vaccination", "generic"];

const FILTER_THEMES: Record<Channel | "all", string> = {
  all: "from-sky-500 via-blue-500 to-indigo-500",
  sms: "from-sky-500 to-blue-500",
  email: "from-indigo-500 to-violet-500",
  whatsapp: "from-emerald-500 to-teal-500",
  push: "from-fuchsia-500 to-pink-500",
  in_app: "from-cyan-500 to-sky-500",
  voice: "from-amber-500 to-orange-500",
};

const STATUS_THEME: Record<NotificationStatus, { pill: string; dot: string }> = {
  queued: { pill: "bg-slate-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  sent: { pill: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  delivered: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  read: { pill: "bg-emerald-100 text-emerald-800 ring-emerald-300", dot: "bg-emerald-600" },
  failed: { pill: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  bounced: { pill: "bg-rose-100 text-rose-800 ring-rose-300", dot: "bg-rose-600" },
};

export default function NotificationsPage() {
  const [list, setList] = useState<Notification[]>([]);
  const [stats, setStats] = useState<{ total: number; today: number; queued: number; sentToday: number; failedToday: number; deliveryRate: number } | null>(null);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<Notification | null>(null);
  const [fCh, setFCh] = useState<Channel | "">("");

  async function load() {
    const res = await fetch("/api/hospital/notifications", { cache: "no-store" });
    const data = await res.json();
    setList(data.notifications || []); setStats(data.stats || null);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string) { if (!confirm("Delete?")) return; await fetch("/api/hospital/notifications", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); load(); }
  async function retry(id: string) { await fetch("/api/hospital/notifications/retry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); load(); }
  const filtered = list.filter((n) => (fCh ? n.channel === fCh : true));

  const unreadFailed = (stats?.queued ?? 0) + (stats?.failedToday ?? 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {unreadFailed} pending · {stats?.failedToday ?? 0} failed today
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-white/80">SMS · Email · WhatsApp · Push · Delivery log</p>
          </div>
          <button onClick={() => { setEdit(null); setShow(true); }} className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25">✉️ + Send</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          <StatTile label="Total" value={stats.total} tone="slate" />
          <StatTile label="Today" value={stats.today} tone="indigo" />
          <StatTile label="Queued" value={stats.queued} tone="amber" />
          <StatTile label="Sent today" value={stats.sentToday} tone="sky" />
          <StatTile label="Failed today" value={stats.failedToday} tone="rose" />
          <StatTile label="Delivery %" value={stats.deliveryRate} tone="emerald" />
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setFCh("")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${fCh === "" ? `bg-gradient-to-r ${FILTER_THEMES.all} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>All</button>
        {CHANNELS.map((c) => (
          <button key={c} onClick={() => setFCh(c)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${fCh === c ? `bg-gradient-to-r ${FILTER_THEMES[c]} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>{CHANNEL_LABEL[c]}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-sky-50/60 via-blue-50/40 to-indigo-50/60 text-left text-xs font-semibold uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">ID</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Body</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((n) => {
                const th = STATUS_THEME[n.status];
                return (
                  <tr key={n.id} className="transition hover:bg-sky-50/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{n.id}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{CHANNEL_LABEL[n.channel]}</td>
                    <td className="px-4 py-3 text-xs">{CATEGORY_LABEL[n.category]}</td>
                    <td className="px-4 py-3 text-xs"><div className="font-semibold text-gray-900">{n.recipientName || "-"}</div><div className="text-gray-500">{n.recipientContact}</div></td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-md truncate">{n.subject ? <b>{n.subject}: </b> : null}{n.body}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${th.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${th.dot}`} />{STATUS_LABEL[n.status]}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{n.sentAt ? new Date(n.sentAt).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(n.status === "failed" || n.status === "queued") && <button onClick={() => retry(n.id)} className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">🔄 Retry</button>}
                        <button onClick={() => { setEdit(n); setShow(true); }} className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">✎ Edit</button>
                        <button onClick={() => del(n.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100">✕ Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">📭 No notifications.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {show && <Modal initial={edit} onClose={() => { setShow(false); setEdit(null); }} onSaved={() => { setShow(false); setEdit(null); load(); }} />}
    </div>
  );
}

function Modal({ initial, onClose, onSaved }: { initial: Notification | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Notification>>(initial ?? { channel: "sms", category: "generic", status: "queued", attemptCount: 0 });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/notifications", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
        <div className="p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{initial ? "✎ Edit notification" : "✉️ New notification"}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Channel"><select className="inp" value={form.channel || "sms"} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select></Field>
            <Field label="Category"><select className="inp" value={form.category || "generic"} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></Field>
            <Field label="Recipient name"><input className="inp" value={form.recipientName || ""} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></Field>
            <Field label="Recipient contact *"><input className="inp" value={form.recipientContact || ""} onChange={(e) => setForm({ ...form, recipientContact: e.target.value })} /></Field>
            <Field label="Patient ID"><input className="inp" value={form.patientId || ""} onChange={(e) => setForm({ ...form, patientId: e.target.value })} /></Field>
            <Field label="Template code"><input className="inp" value={form.templateCode || ""} onChange={(e) => setForm({ ...form, templateCode: e.target.value })} /></Field>
            <Field label="Subject" full><input className="inp" value={form.subject || ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
            <Field label="Body *" full><textarea className="inp" rows={4} value={form.body || ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            <Field label="Status"><select className="inp" value={form.status || "queued"} onChange={(e) => setForm({ ...form, status: e.target.value as NotificationStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
            <Field label="Scheduled for"><input type="datetime-local" className="inp" value={(form.scheduledFor || "").slice(0, 16)} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} /></Field>
            <Field label="Sent at"><input type="datetime-local" className="inp" value={(form.sentAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, sentAt: e.target.value })} /></Field>
            <Field label="Delivered at"><input type="datetime-local" className="inp" value={(form.deliveredAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, deliveredAt: e.target.value })} /></Field>
            <Field label="Provider ref"><input className="inp" value={form.providerRef || ""} onChange={(e) => setForm({ ...form, providerRef: e.target.value })} /></Field>
            <Field label="Cost estimate"><input type="number" step="0.01" className="inp" value={form.costEstimate ?? ""} onChange={(e) => setForm({ ...form, costEstimate: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
            <Field label="Error message" full><input className="inp" value={form.errorMessage || ""} onChange={(e) => setForm({ ...form, errorMessage: e.target.value })} /></Field>
          </div>
          {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow">Cancel</button>
            <button onClick={submit} disabled={busy} className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">{busy ? "Saving…" : "💾 Save"}</button>
          </div>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" | "sky" }) {
  const t: Record<string, string> = {
    slate: "from-slate-50 to-slate-100 text-slate-700 ring-slate-200",
    amber: "from-amber-50 to-orange-100 text-amber-700 ring-amber-200",
    rose: "from-rose-50 to-pink-100 text-rose-700 ring-rose-200",
    emerald: "from-emerald-50 to-teal-100 text-emerald-700 ring-emerald-200",
    indigo: "from-indigo-50 to-blue-100 text-indigo-700 ring-indigo-200",
    sky: "from-sky-50 to-blue-100 text-sky-700 ring-sky-200",
  };
  return <div className={`rounded-xl bg-gradient-to-br p-4 ring-1 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>{children}</label>; }
