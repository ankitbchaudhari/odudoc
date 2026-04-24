"use client";

import { useEffect, useState } from "react";
import type { Document, DocCategory, DocStatus, AccessLevel } from "@/lib/hospital/documents-store";

// Inlined from documents-store. Importing the runtime `*_LABEL` values from
// the store pulls persistent-array → Postgres into the client bundle and
// crashes the page. Types are erased at build so `import type` above is safe.
const CATEGORY_LABEL: Record<DocCategory, string> = { clinical: "Clinical", consent: "Consent", insurance: "Insurance", billing: "Billing", imaging: "Imaging", lab_report: "Lab report", discharge: "Discharge", prescription: "Prescription", legal: "Legal", hr: "HR", regulatory: "Regulatory", policy: "Policy", protocol: "Protocol", contract: "Contract", identity: "Identity", other: "Other" };
const STATUS_LABEL: Record<DocStatus, string> = { draft: "Draft", pending_review: "Pending review", approved: "Approved", active: "Active", superseded: "Superseded", archived: "Archived", expired: "Expired", rejected: "Rejected" };
const ACCESS_LABEL: Record<AccessLevel, string> = { public: "Public", internal: "Internal", restricted: "Restricted", confidential: "Confidential", highly_confidential: "Highly confidential" };

interface Patient { id: string; firstName: string; lastName: string; }
const CATEGORIES: DocCategory[] = ["clinical", "consent", "insurance", "billing", "imaging", "lab_report", "discharge", "prescription", "legal", "hr", "regulatory", "policy", "protocol", "contract", "identity", "other"];
const STATUSES: DocStatus[] = ["draft", "pending_review", "approved", "active", "superseded", "archived", "expired", "rejected"];
const ACCESS: AccessLevel[] = ["public", "internal", "restricted", "confidential", "highly_confidential"];

const FILTER_THEMES: Record<DocCategory | "all", string> = {
  all: "from-amber-500 via-orange-500 to-red-500",
  clinical: "from-rose-500 to-red-500",
  consent: "from-amber-500 to-orange-500",
  insurance: "from-sky-500 to-blue-500",
  billing: "from-emerald-500 to-teal-500",
  imaging: "from-fuchsia-500 to-pink-500",
  lab_report: "from-violet-500 to-purple-500",
  discharge: "from-cyan-500 to-sky-500",
  prescription: "from-pink-500 to-rose-500",
  legal: "from-slate-500 to-gray-600",
  hr: "from-indigo-500 to-blue-500",
  regulatory: "from-orange-500 to-amber-500",
  policy: "from-teal-500 to-emerald-500",
  protocol: "from-blue-500 to-indigo-500",
  contract: "from-purple-500 to-fuchsia-500",
  identity: "from-lime-500 to-green-500",
  other: "from-gray-500 to-slate-500",
};

const STATUS_THEME: Record<DocStatus, { pill: string; dot: string }> = {
  draft: { pill: "bg-slate-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  pending_review: { pill: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  approved: { pill: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  active: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  superseded: { pill: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  archived: { pill: "bg-gray-50 text-gray-700 ring-gray-200", dot: "bg-gray-400" },
  expired: { pill: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  rejected: { pill: "bg-rose-100 text-rose-800 ring-rose-300", dot: "bg-rose-600" },
};

export default function DocumentsPage() {
  const [list, setList] = useState<Document[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; pending: number; expiringSoon: number; expired: number; totalSize: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<Document | null>(null);
  const [fCat, setFCat] = useState<DocCategory | "">("");
  const [search, setSearch] = useState("");

  async function load() {
    const qs = new URLSearchParams();
    if (fCat) qs.set("category", fCat);
    if (search) qs.set("search", search);
    const res = await fetch(`/api/hospital/documents?${qs}`, { cache: "no-store" });
    const data = await res.json();
    setList(data.documents || []); setStats(data.stats || null);
  }
  async function loadPatients() { try { const r = await fetch("/api/patients", { cache: "no-store" }); const d = await r.json(); setPatients(d.patients || []); } catch {} }
  useEffect(() => { load(); loadPatients(); }, [fCat]);

  async function del(id: string) { if (!confirm("Delete?")) return; await fetch("/api/hospital/documents", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {stats?.total ?? 0} documents · {stats?.active ?? 0} active
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Document Archive</h1>
            <p className="mt-1 text-sm text-white/80">Clinical · Consent · Policy · Regulatory · Versioned catalog</p>
          </div>
          <button onClick={() => { setEdit(null); setShow(true); }} className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25">📄 + Document</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          <StatTile label="Total" value={stats.total} tone="slate" />
          <StatTile label="Active" value={stats.active} tone="emerald" />
          <StatTile label="Pending" value={stats.pending} tone="amber" />
          <StatTile label="Expiring 30d" value={stats.expiringSoon} tone="orange" />
          <StatTile label="Expired" value={stats.expired} tone="rose" />
          <StatTile label="MB stored" value={stats.totalSize} tone="indigo" />
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search title / number / tags..." className="w-full rounded-lg bg-white px-9 py-2 text-sm ring-1 ring-gray-200 transition focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <button onClick={load} className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Search</button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setFCat("")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${fCat === "" ? `bg-gradient-to-r ${FILTER_THEMES.all} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFCat(c)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${fCat === c ? `bg-gradient-to-r ${FILTER_THEMES[c]} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>{CATEGORY_LABEL[c]}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-red-50/60 text-left text-xs font-semibold uppercase text-gray-600">
              <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((r) => {
                const st = STATUS_THEME[r.status];
                return (
                  <tr key={r.id} className="transition hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600"><div>{r.id}</div>{r.documentNumber && <div className="text-gray-500">{r.documentNumber}</div>}</td>
                    <td className="px-4 py-3 text-xs"><div className="max-w-xs truncate font-semibold text-gray-900">{r.title}</div>{r.fileName && <div className="text-gray-500">{r.fileName}</div>}{r.patientName && <div className="text-gray-500">Patient: {r.patientName}</div>}</td>
                    <td className="px-4 py-3 text-xs">{CATEGORY_LABEL[r.category]}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${st.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{STATUS_LABEL[r.status]}</span></td>
                    <td className="px-4 py-3 text-xs font-semibold">{r.version}</td>
                    <td className="px-4 py-3 text-xs">{ACCESS_LABEL[r.accessLevel]}</td>
                    <td className="px-4 py-3 text-xs">{r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-xs">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEdit(r); setShow(true); }} className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">✎ Edit</button>
                        <button onClick={() => del(r.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100">✕ Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={9} className="py-16 text-center text-sm text-gray-400">📄 No documents.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {show && <Modal patients={patients} initial={edit} onClose={() => { setShow(false); setEdit(null); }} onSaved={() => { setShow(false); setEdit(null); load(); }} />}
    </div>
  );
}

function Modal({ patients, initial, onClose, onSaved }: { patients: Patient[]; initial: Document | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Document>>(initial ?? { category: "clinical", status: "draft", accessLevel: "internal", version: "1.0" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  function onPatient(id: string) { const p = patients.find((x) => x.id === id); setForm({ ...form, patientId: id || undefined, patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName }); }
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/documents", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <div className="p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{initial ? "✎ Edit document" : "📄 New document"}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Title *" full><input className="inp" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Category *"><select className="inp" value={form.category || "clinical"} onChange={(e) => setForm({ ...form, category: e.target.value as DocCategory })}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></Field>
            <Field label="Status"><select className="inp" value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value as DocStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
            <Field label="Document #"><input className="inp" value={form.documentNumber || ""} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></Field>
            <Field label="Version"><input className="inp" value={form.version || ""} onChange={(e) => setForm({ ...form, version: e.target.value })} /></Field>
            <Field label="Access level"><select className="inp" value={form.accessLevel || "internal"} onChange={(e) => setForm({ ...form, accessLevel: e.target.value as AccessLevel })}>{ACCESS.map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}</select></Field>
            <Field label="Supersedes (doc id)"><input className="inp" value={form.supersedes || ""} onChange={(e) => setForm({ ...form, supersedes: e.target.value })} /></Field>
            <Field label="Patient"><select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}><option value="">-- None --</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select></Field>
            <Field label="Encounter ID"><input className="inp" value={form.encounterId || ""} onChange={(e) => setForm({ ...form, encounterId: e.target.value })} /></Field>
            <Field label="Department"><input className="inp" value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Author name"><input className="inp" value={form.authorName || ""} onChange={(e) => setForm({ ...form, authorName: e.target.value })} /></Field>
            <Field label="Author role"><input className="inp" value={form.authorRole || ""} onChange={(e) => setForm({ ...form, authorRole: e.target.value })} /></Field>
            <Field label="Reviewed by"><input className="inp" value={form.reviewedBy || ""} onChange={(e) => setForm({ ...form, reviewedBy: e.target.value })} /></Field>
            <Field label="Approved by"><input className="inp" value={form.approvedBy || ""} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} /></Field>
            <Field label="Effective date"><input type="date" className="inp" value={(form.effectiveDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} /></Field>
            <Field label="Expiry date"><input type="date" className="inp" value={(form.expiryDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
            <Field label="Retention until"><input type="date" className="inp" value={(form.retentionUntil || "").slice(0, 10)} onChange={(e) => setForm({ ...form, retentionUntil: e.target.value })} /></Field>
            <Field label="File name"><input className="inp" value={form.fileName || ""} onChange={(e) => setForm({ ...form, fileName: e.target.value })} /></Field>
            <Field label="File size (bytes)"><input type="number" className="inp" value={form.fileSize ?? ""} onChange={(e) => setForm({ ...form, fileSize: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
            <Field label="MIME type"><input className="inp" value={form.mimeType || ""} onChange={(e) => setForm({ ...form, mimeType: e.target.value })} /></Field>
            <Field label="Storage URI" full><input className="inp" value={form.storageUri || ""} onChange={(e) => setForm({ ...form, storageUri: e.target.value })} /></Field>
            <Field label="Checksum"><input className="inp" value={form.checksum || ""} onChange={(e) => setForm({ ...form, checksum: e.target.value })} /></Field>
            <Field label="Tags (comma)"><input className="inp" value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
            <Field label="Description" full><textarea className="inp" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
          {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow">Cancel</button>
            <button onClick={submit} disabled={busy} className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">{busy ? "Saving…" : "💾 Save"}</button>
          </div>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" | "orange" }) {
  const t: Record<string, string> = {
    slate: "from-slate-50 to-slate-100 text-slate-700 ring-slate-200",
    amber: "from-amber-50 to-orange-100 text-amber-700 ring-amber-200",
    rose: "from-rose-50 to-pink-100 text-rose-700 ring-rose-200",
    emerald: "from-emerald-50 to-teal-100 text-emerald-700 ring-emerald-200",
    indigo: "from-indigo-50 to-blue-100 text-indigo-700 ring-indigo-200",
    orange: "from-orange-50 to-red-100 text-orange-700 ring-orange-200",
  };
  return <div className={`rounded-xl bg-gradient-to-br p-4 ring-1 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>{children}</label>; }
