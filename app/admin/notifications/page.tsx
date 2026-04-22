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

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Notifications</h1><p className="text-sm text-slate-500">SMS · Email · WhatsApp · Push · Delivery log</p></div>
        <button onClick={() => { setEdit(null); setShow(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">+ Send</button>
      </div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          <StatTile label="Total" value={stats.total} tone="slate" />
          <StatTile label="Today" value={stats.today} tone="indigo" />
          <StatTile label="Queued" value={stats.queued} tone="amber" />
          <StatTile label="Sent today" value={stats.sentToday} tone="emerald" />
          <StatTile label="Failed today" value={stats.failedToday} tone="rose" />
          <StatTile label="Delivery %" value={stats.deliveryRate} tone="emerald" />
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterPill active={fCh === ""} onClick={() => setFCh("")}>All</FilterPill>
        {CHANNELS.map((c) => <FilterPill key={c} active={fCh === c} onClick={() => setFCh(c)}>{CHANNEL_LABEL[c]}</FilterPill>)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Body</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{n.id}</td>
                <td className="px-4 py-3 text-xs">{CHANNEL_LABEL[n.channel]}</td>
                <td className="px-4 py-3 text-xs">{CATEGORY_LABEL[n.category]}</td>
                <td className="px-4 py-3 text-xs"><div className="font-semibold">{n.recipientName || "-"}</div><div className="text-slate-500">{n.recipientContact}</div></td>
                <td className="px-4 py-3 text-xs text-slate-700 max-w-md truncate">{n.subject ? <b>{n.subject}: </b> : null}{n.body}</td>
                <td className="px-4 py-3"><Pill status={n.status}>{STATUS_LABEL[n.status]}</Pill></td>
                <td className="px-4 py-3 text-xs">{n.sentAt ? new Date(n.sentAt).toLocaleString() : "-"}</td>
                <td className="px-4 py-3 text-right">{(n.status === "failed" || n.status === "queued") && <button onClick={() => retry(n.id)} className="mr-2 text-xs font-semibold text-amber-600">Retry</button>}<button onClick={() => { setEdit(n); setShow(true); }} className="mr-2 text-xs font-semibold text-primary-600">Edit</button><button onClick={() => del(n.id)} className="text-xs font-semibold text-rose-600">Delete</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8}><Empty>No notifications.</Empty></td></tr>}
          </tbody>
        </table>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit notification" : "New notification"}</h2>
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
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>; }
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = { queued: "bg-slate-100 text-slate-700", sent: "bg-indigo-100 text-indigo-700", delivered: "bg-emerald-100 text-emerald-700", read: "bg-emerald-200 text-emerald-800", failed: "bg-rose-100 text-rose-700", bounced: "bg-rose-200 text-rose-800" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-slate-500">{children}</div>; }
