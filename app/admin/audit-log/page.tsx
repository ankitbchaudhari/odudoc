"use client";

import { useEffect, useState } from "react";
import type { AuditEntry, AuditAction, Severity } from "@/lib/hospital/audit-log-store";
import { PageHero, StatGrid, StatCard, FilterChip } from "@/components/admin/PageShell";

// Inlined from audit-log-store — see documents/page.tsx comment for why.
const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Create", read: "Read", update: "Update", delete: "Delete",
  login: "Login", logout: "Logout", export: "Export", print: "Print",
  approve: "Approve", reject: "Reject", void: "Void", reverse: "Reverse", other: "Other",
};
const SEVERITY_LABEL: Record<Severity, string> = { info: "Info", warning: "Warning", critical: "Critical" };

const ACTIONS: AuditAction[] = ["create", "read", "update", "delete", "login", "logout", "export", "print", "approve", "reject", "void", "reverse", "other"];
const SEVERITIES: Severity[] = ["info", "warning", "critical"];

export default function AuditLogPage() {
  const [list, setList] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<{ total: number; today: number; critical: number; warnings: number; deletesToday: number; loginsToday: number } | null>(null);
  const [show, setShow] = useState(false);
  const [view, setView] = useState<AuditEntry | null>(null);
  const [fAction, setFAction] = useState<AuditAction | "">("");
  const [fSev, setFSev] = useState<Severity | "">("");

  async function load() {
    const qs = new URLSearchParams();
    if (fAction) qs.set("action", fAction);
    if (fSev) qs.set("severity", fSev);
    const res = await fetch(`/api/hospital/audit-log?${qs}`, { cache: "no-store" });
    const data = await res.json();
    setList(data.entries || []); setStats(data.stats || null);
  }
  useEffect(() => { load(); }, [fAction, fSev]);

  async function del(id: string) { if (!confirm("Delete?")) return; await fetch("/api/hospital/audit-log", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="🛡️"
        eyebrow="Compliance"
        title="Audit Log"
        subtitle={`Tamper-evident activity ledger · ${list.length} entries shown (max 500)`}
        tone="rose"
        primaryAction={{ label: "+ Manual entry", onClick: () => setShow(true) }}
      />
      {stats && (
        <StatGrid cols={6}>
          <StatCard label="Total" value={stats.total} tone="slate" icon="∑" />
          <StatCard label="Today" value={stats.today} tone="indigo" icon="🕐" />
          <StatCard label="Critical" value={stats.critical} tone="rose" icon="🚨" />
          <StatCard label="Warnings" value={stats.warnings} tone="amber" icon="⚠" />
          <StatCard label="Deletes today" value={stats.deletesToday} tone="orange" icon="🗑" />
          <StatCard label="Logins today" value={stats.loginsToday} tone="emerald" icon="🔓" />
        </StatGrid>
      )}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={fAction === ""} onClick={() => setFAction("")}>All actions</FilterChip>
        {ACTIONS.map((a) => <FilterChip key={a} active={fAction === a} onClick={() => setFAction(a)}>{ACTION_LABEL[a]}</FilterChip>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={fSev === ""} onClick={() => setFSev("")}>All severities</FilterChip>
        {SEVERITIES.map((s) => <FilterChip key={s} active={fSev === s} onClick={() => setFSev(s)}>{SEVERITY_LABEL[s]}</FilterChip>)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.occurredAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs"><div className="font-semibold">{r.actorName}</div>{r.actorRole && <div className="text-slate-500">{r.actorRole}</div>}</td>
                <td className="px-4 py-3 text-xs">{ACTION_LABEL[r.action]}</td>
                <td className="px-4 py-3 text-xs"><div className="font-semibold">{r.entityType}</div>{r.entityLabel && <div className="text-slate-500 truncate max-w-xs">{r.entityLabel}</div>}{r.entityId && <div className="font-mono text-slate-400">{r.entityId}</div>}</td>
                <td className="px-4 py-3 text-xs">{r.module || "-"}</td>
                <td className="px-4 py-3"><SevPill s={r.severity}>{SEVERITY_LABEL[r.severity]}</SevPill></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setView(r)} className="mr-2 text-xs font-semibold text-primary-600">View</button>
                  <button onClick={() => del(r.id)} className="text-xs font-semibold text-rose-600">Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8}><Empty>No entries.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {show && <AddModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
      {view && <ViewModal entry={view} onClose={() => setView(null)} />}
    </div>
  );
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<AuditEntry>>({ action: "other", severity: "info" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function submit() {
    setBusy(true); setErr("");
    const res = await fetch("/api/hospital/audit-log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Manual audit entry</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Actor name *"><input className="inp" value={form.actorName || ""} onChange={(e) => setForm({ ...form, actorName: e.target.value })} /></Field>
          <Field label="Actor role"><input className="inp" value={form.actorRole || ""} onChange={(e) => setForm({ ...form, actorRole: e.target.value })} /></Field>
          <Field label="Action"><select className="inp" value={form.action || "other"} onChange={(e) => setForm({ ...form, action: e.target.value as AuditAction })}>{ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}</select></Field>
          <Field label="Severity"><select className="inp" value={form.severity || "info"} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}>{SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}</select></Field>
          <Field label="Entity type *"><input className="inp" value={form.entityType || ""} onChange={(e) => setForm({ ...form, entityType: e.target.value })} /></Field>
          <Field label="Entity ID"><input className="inp" value={form.entityId || ""} onChange={(e) => setForm({ ...form, entityId: e.target.value })} /></Field>
          <Field label="Entity label" full><input className="inp" value={form.entityLabel || ""} onChange={(e) => setForm({ ...form, entityLabel: e.target.value })} /></Field>
          <Field label="Module"><input className="inp" value={form.module || ""} onChange={(e) => setForm({ ...form, module: e.target.value })} /></Field>
          <Field label="IP address"><input className="inp" value={form.ipAddress || ""} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} /></Field>
          <Field label="Reason" full><input className="inp" value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Field label="Before (JSON)" full><textarea className="inp font-mono text-xs" rows={3} value={form.before || ""} onChange={(e) => setForm({ ...form, before: e.target.value })} /></Field>
          <Field label="After (JSON)" full><textarea className="inp font-mono text-xs" rows={3} value={form.after || ""} onChange={(e) => setForm({ ...form, after: e.target.value })} /></Field>
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

function ViewModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">{entry.id}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Kv k="When" v={new Date(entry.occurredAt).toLocaleString()} />
          <Kv k="Actor" v={`${entry.actorName}${entry.actorRole ? " (" + entry.actorRole + ")" : ""}`} />
          <Kv k="Action" v={ACTION_LABEL[entry.action]} />
          <Kv k="Severity" v={SEVERITY_LABEL[entry.severity]} />
          <Kv k="Entity" v={`${entry.entityType}${entry.entityId ? " · " + entry.entityId : ""}`} />
          <Kv k="Module" v={entry.module || "-"} />
          {entry.ipAddress && <Kv k="IP" v={entry.ipAddress} />}
          {entry.sessionId && <Kv k="Session" v={entry.sessionId} />}
        </div>
        {entry.reason && <div className="mt-3"><div className="text-xs font-semibold text-slate-600">Reason</div><div className="text-sm">{entry.reason}</div></div>}
        {entry.notes && <div className="mt-3"><div className="text-xs font-semibold text-slate-600">Notes</div><div className="text-sm whitespace-pre-wrap">{entry.notes}</div></div>}
        {entry.before && <div className="mt-3"><div className="text-xs font-semibold text-slate-600">Before</div><pre className="mt-1 rounded-lg bg-slate-50 p-3 text-xs overflow-auto">{entry.before}</pre></div>}
        {entry.after && <div className="mt-3"><div className="text-xs font-semibold text-slate-600">After</div><pre className="mt-1 rounded-lg bg-slate-50 p-3 text-xs overflow-auto">{entry.after}</pre></div>}
        <div className="mt-6 flex justify-end"><button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Close</button></div>
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) { return <div><div className="text-xs font-semibold text-slate-500">{k}</div><div className="text-sm">{v}</div></div>; }
function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>; }
function SevPill({ s, children }: { s: Severity; children: React.ReactNode }) {
  const map: Record<Severity, string> = { info: "bg-slate-100 text-slate-700", warning: "bg-amber-100 text-amber-700", critical: "bg-rose-100 text-rose-700" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[s]}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-slate-500">{children}</div>; }
