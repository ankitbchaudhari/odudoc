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
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Document Archive</h1><p className="text-sm text-slate-500">Clinical · Consent · Policy · Regulatory · Versioned catalog</p></div>
        <button onClick={() => { setEdit(null); setShow(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">+ Document</button>
      </div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          <StatTile label="Total" value={stats.total} tone="slate" />
          <StatTile label="Active" value={stats.active} tone="emerald" />
          <StatTile label="Pending" value={stats.pending} tone="amber" />
          <StatTile label="Expiring 30d" value={stats.expiringSoon} tone="amber" />
          <StatTile label="Expired" value={stats.expired} tone="rose" />
          <StatTile label="MB stored" value={stats.totalSize} tone="indigo" />
        </div>
      )}
      <div className="mb-3 flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search title/number/tags..." className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button onClick={load} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Search</button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterPill active={fCat === ""} onClick={() => setFCat("")}>All</FilterPill>
        {CATEGORIES.map((c) => <FilterPill key={c} active={fCat === c} onClick={() => setFCat(c)}>{CATEGORY_LABEL[c]}</FilterPill>)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs"><div>{r.id}</div>{r.documentNumber && <div className="text-slate-500">{r.documentNumber}</div>}</td>
                <td className="px-4 py-3 text-xs"><div className="font-semibold max-w-xs truncate">{r.title}</div>{r.fileName && <div className="text-slate-500">{r.fileName}</div>}{r.patientName && <div className="text-slate-500">Patient: {r.patientName}</div>}</td>
                <td className="px-4 py-3 text-xs">{CATEGORY_LABEL[r.category]}</td>
                <td className="px-4 py-3 text-xs">{STATUS_LABEL[r.status]}</td>
                <td className="px-4 py-3 text-xs">{r.version}</td>
                <td className="px-4 py-3 text-xs">{ACCESS_LABEL[r.accessLevel]}</td>
                <td className="px-4 py-3 text-xs">{r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-3 text-xs">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => { setEdit(r); setShow(true); }} className="mr-2 text-xs font-semibold text-primary-600">Edit</button><button onClick={() => del(r.id)} className="text-xs font-semibold text-rose-600">Delete</button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9}><Empty>No documents.</Empty></td></tr>}
          </tbody>
        </table>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit document" : "New document"}</h2>
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
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-slate-500">{children}</div>; }
