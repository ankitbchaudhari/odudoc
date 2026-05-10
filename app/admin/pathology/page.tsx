"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type { Specimen, SpecimenType, SpecimenStatus, Urgency, Malignancy } from "@/lib/hospital/pathology-store";
// Inlined from pathology-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const TYPE_LABEL: Record<SpecimenType, string> = {
  biopsy: "Biopsy", resection: "Resection", frozen_section: "Frozen section",
  cytology_fluid: "Cytology (fluid)", cytology_pap: "Pap smear", fnac: "FNAC",
  bone_marrow: "Bone marrow", autopsy: "Autopsy", explant: "Explant",
  product_of_conception: "POC", other: "Other",
};
const MALIGNANCY_LABEL: Record<Malignancy, string> = {
  benign: "Benign", atypical: "Atypical", in_situ: "In situ", malignant: "Malignant",
  suspicious: "Suspicious", inadequate: "Inadequate", na: "N/A",
};

interface Patient { id: string; firstName: string; lastName: string; mrn?: string }

const TYPES: SpecimenType[] = ["biopsy","resection","frozen_section","cytology_fluid","cytology_pap","fnac","bone_marrow","autopsy","explant","product_of_conception","other"];
const STATUSES: SpecimenStatus[] = ["received","grossing","processing","microscopy","reported","amended","cancelled"];
const URGENCIES: Urgency[] = ["routine","urgent","stat","frozen"];
const MALIGS: Malignancy[] = ["benign","atypical","in_situ","malignant","suspicious","inadequate","na"];

const STATUS_COLOR: Record<SpecimenStatus, string> = {
  received: "bg-sky-100 text-sky-700", grossing: "bg-amber-100 text-amber-700",
  processing: "bg-amber-100 text-amber-700", microscopy: "bg-violet-100 text-violet-700",
  reported: "bg-emerald-100 text-emerald-700", amended: "bg-violet-100 text-violet-700",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};
const MALIG_COLOR: Record<Malignancy, string> = {
  benign: "bg-emerald-100 text-emerald-700", atypical: "bg-amber-100 text-amber-700",
  in_situ: "bg-orange-100 text-orange-700", malignant: "bg-rose-100 text-rose-700",
  suspicious: "bg-amber-100 text-amber-700", inadequate: "bg-slate-100 text-slate-600", na: "bg-slate-100 text-slate-600",
};
function fmt(iso?: string) { return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

export default function PathologyPage() {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState<SpecimenStatus | "">("");
  const [fType, setFType] = useState<SpecimenType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Specimen | null>(null);
  const [signOut, setSignOut] = useState<Specimen | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (fStatus) p.set("status", fStatus); if (fType) p.set("type", fType);
    const [r, pR] = await Promise.all([
      fetch(`/api/hospital/pathology?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (r.ok) { const d = await r.json(); setSpecimens(d.specimens || []); setStats(d.stats); }
    if (pR.ok) { const d = await pR.json(); setPatients(d.patients || []); }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [fStatus, fType]);

  async function save(body: Partial<Specimen>) {
    const method = body.id ? "PATCH" : "POST";
    const r = await fetch("/api/hospital/pathology", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    setShowForm(false); setEdit(null); setSignOut(null); load();
  }
  async function transition(id: string, status: SpecimenStatus) { await save({ id, status }); }
  async function del(id: string) {
    if (!confirm("Delete this specimen?")) return;
    await fetch("/api/hospital/pathology", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🔬"
        eyebrow="Diagnostics"
        title="Pathology"
        subtitle="Histopathology, cytology, FNAC, frozen section — gross-to-sign-out workflow with TNM & synoptic reporting"
        tone="fuchsia"
        primaryAction={{ label: "+ Accession specimen", onClick: () => { setEdit(null); setShowForm(true); } }}
      />

      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Received today" value={stats.receivedToday} tone="sky" icon="📥" />
          <StatCard label="In process" value={stats.inProcess} tone={stats.inProcess > 0 ? "amber" : "slate"} icon="🧪" />
          <StatCard label="Frozen pending" value={stats.frozenPending} tone={stats.frozenPending > 0 ? "rose" : "slate"} icon="❄️" />
          <StatCard label="Reported (mo)" value={stats.reportedMonth} tone="emerald" icon="📄" />
          <StatCard label="Malignant (mo)" value={stats.malignantMonth} tone={stats.malignantMonth > 0 ? "rose" : "slate"} icon="⚠️" />
          <StatCard label="Amended (mo)" value={stats.amendedMonth} tone="violet" icon="✎" />
          <StatCard label="Avg TAT (hrs)" value={stats.avgTatHours} tone="indigo" icon="⏱️" />
          <StatCard label="Overdue (>7d)" value={stats.overdue} tone={stats.overdue > 0 ? "amber" : "slate"} icon="⏰" />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as SpecimenStatus | "")} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Type</span>
        <select value={fType} onChange={(e) => setFType(e.target.value as SpecimenType | "")} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"><option value="">All</option>{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : specimens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No specimens yet.</div>
      ) : (
        <div className="space-y-2">
          {specimens.map((s) => <SpecimenCard key={s.id} s={s} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onEdit={() => { setEdit(s); setShowForm(true); }} onSignOut={() => setSignOut(s)} onTransition={transition} onDelete={() => del(s.id)} />)}
        </div>
      )}

      {showForm && <SpecimenFormModal specimen={edit} patients={patients} onClose={() => { setShowForm(false); setEdit(null); }} onSave={save} />}
      {signOut && <SignOutModal specimen={signOut} onClose={() => setSignOut(null)} onSave={save} />}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "amber" | "rose" | "emerald" }) {
  const c = { slate: "text-slate-900", amber: "text-amber-700", rose: "text-rose-700", emerald: "text-emerald-700" }[tone];
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">{label}</div><div className={`mt-0.5 text-xl font-semibold ${c}`}>{value}</div></div>;
}

function SpecimenCard({ s, expanded, onToggle, onEdit, onSignOut, onTransition, onDelete }: {
  s: Specimen; expanded: boolean; onToggle: () => void; onEdit: () => void;
  onSignOut: () => void; onTransition: (id: string, status: SpecimenStatus) => void; onDelete: () => void;
}) {
  const tatDays = s.reportedAt ? (new Date(s.reportedAt).getTime() - new Date(s.receivedAt).getTime()) / 86_400_000 : null;
  const overdue = !s.reportedAt && s.status !== "cancelled" && ((Date.now() - new Date(s.receivedAt).getTime()) / 86_400_000) > 7;
  return (
    <div className={`rounded-lg border bg-white ${s.malignancy === "malignant" ? "border-rose-200" : overdue ? "border-amber-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start gap-3 p-3">
        <div className="flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status]}`}>{s.status}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{TYPE_LABEL[s.specimenType]}</span>
            {s.urgency !== "routine" && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.urgency === "frozen" ? "bg-rose-100 text-rose-700" : s.urgency === "stat" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{s.urgency}</span>}
            {s.malignancy && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MALIG_COLOR[s.malignancy]}`}>{MALIGNANCY_LABEL[s.malignancy]}</span>}
            {s.tnm && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{s.tnm}</span>}
            {s.marginsStatus && s.marginsStatus !== "na" && <span className={`rounded-full px-2 py-0.5 text-xs ${s.marginsStatus === "negative" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>Margins {s.marginsStatus}</span>}
            {overdue && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Overdue</span>}
          </div>
          <div className="mt-1 font-semibold text-slate-900">{s.patientName}</div>
          <div className="text-xs text-slate-500">{s.id} · received {fmt(s.receivedAt)}{s.submittedBy ? ` · by ${s.submittedBy}` : ""}{tatDays != null ? ` · TAT ${tatDays.toFixed(1)}d` : ""}</div>
          <div className="mt-1 text-sm text-slate-700">Site: {s.site}</div>
          {s.diagnosis && <div className="mt-1 text-sm text-slate-800"><span className="font-medium">Dx:</span> {s.diagnosis}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status === "received" && <button onClick={() => onTransition(s.id, "grossing")} className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">Start grossing</button>}
          {s.status === "grossing" && <button onClick={() => onTransition(s.id, "processing")} className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">To processing</button>}
          {s.status === "processing" && <button onClick={() => onTransition(s.id, "microscopy")} className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700">To microscopy</button>}
          {(s.status === "microscopy" || s.status === "processing" || s.status === "grossing") && <button onClick={onSignOut} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Sign out</button>}
          {s.status === "reported" && <button onClick={onSignOut} className="rounded-md border border-violet-300 bg-white px-2 py-1 text-xs text-violet-700 hover:bg-violet-50">Amend</button>}
          <button onClick={onEdit} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
          <button onClick={onDelete} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
          {(s.grossDescription || s.microscopicDescription || s.synopticReport) && <button onClick={onToggle} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">{expanded ? "Hide" : "Report"}</button>}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-3 text-sm text-slate-700 space-y-2">
          {s.clinicalInfo && <div><span className="font-medium">Clinical info:</span> {s.clinicalInfo}</div>}
          {s.grossDescription && <div><span className="font-medium">Gross:</span> {s.grossDescription}</div>}
          {s.microscopicDescription && <div><span className="font-medium">Microscopy:</span> {s.microscopicDescription}</div>}
          {s.diagnosis && <div><span className="font-medium">Diagnosis:</span> {s.diagnosis}</div>}
          {s.tumorType && <div><span className="font-medium">Tumor type:</span> {s.tumorType}{s.grade ? ` · ${s.grade}` : ""}</div>}
          {(s.lymphNodesExamined != null || s.lymphNodesPositive != null) && <div><span className="font-medium">LN:</span> {s.lymphNodesPositive || 0}/{s.lymphNodesExamined || 0}</div>}
          {s.ihcResults && <div><span className="font-medium">IHC:</span> {s.ihcResults}</div>}
          {s.synopticReport && <div className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-2 text-xs">{s.synopticReport}</div>}
          {s.comment && <div className="text-xs text-slate-500"><span className="font-medium">Comment:</span> {s.comment}</div>}
          <div className="text-xs text-slate-500">{s.signedOutBy ? `Signed out by ${s.signedOutBy}` : ""}{s.reportedAt ? ` at ${fmt(s.reportedAt)}` : ""}</div>
        </div>
      )}
    </div>
  );
}

function SpecimenFormModal({ specimen, patients, onClose, onSave }: { specimen: Specimen | null; patients: Patient[]; onClose: () => void; onSave: (b: Partial<Specimen>) => void }) {
  const [form, setForm] = useState({
    patientId: specimen?.patientId || "", patientName: specimen?.patientName || "",
    specimenType: (specimen?.specimenType || "biopsy") as SpecimenType,
    site: specimen?.site || "",
    clinicalInfo: specimen?.clinicalInfo || "",
    urgency: (specimen?.urgency || "routine") as Urgency,
    submittedBy: specimen?.submittedBy || "",
    containers: specimen?.containers?.toString() || "",
    fixative: specimen?.fixative || "",
  });
  function pick(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({ ...form, patientId: id, patientName: p ? `${p.firstName} ${p.lastName}` : "" });
  }
  function submit() {
    if (!form.patientId || !form.site) { alert("Patient and site required"); return; }
    onSave({ id: specimen?.id, ...form, containers: form.containers ? Number(form.containers) : undefined });
  }
  return (
    <Modal title={specimen ? `Edit ${specimen.id}` : "Accession specimen"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient" full>
          <select value={form.patientId} onChange={(e) => pick(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" disabled={!!specimen}>
            <option value="">Select patient…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.mrn ? ` · ${p.mrn}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Type"><select value={form.specimenType} onChange={(e) => setForm({ ...form, specimenType: e.target.value as SpecimenType })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></Field>
        <Field label="Urgency"><select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{URGENCIES.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
        <Field label="Site" full><input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="e.g. left breast UOQ, colon transverse" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Clinical info" full><textarea value={form.clinicalInfo} onChange={(e) => setForm({ ...form, clinicalInfo: e.target.value })} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Submitted by"><input value={form.submittedBy} onChange={(e) => setForm({ ...form, submittedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Containers"><input type="number" value={form.containers} onChange={(e) => setForm({ ...form, containers: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Fixative" full><input value={form.fixative} onChange={(e) => setForm({ ...form, fixative: e.target.value })} placeholder="10% NBF, saline, …" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} />
    </Modal>
  );
}

function SignOutModal({ specimen, onClose, onSave }: { specimen: Specimen; onClose: () => void; onSave: (b: Partial<Specimen>) => void }) {
  const amending = specimen.status === "reported";
  const [f, setF] = useState<any>({
    grossedBy: specimen.grossedBy || "", signedOutBy: specimen.signedOutBy || "",
    grossDescription: specimen.grossDescription || "", dimensions: specimen.dimensions || "", weightG: specimen.weightG?.toString() || "",
    microscopicDescription: specimen.microscopicDescription || "",
    diagnosis: specimen.diagnosis || "",
    malignancy: specimen.malignancy || "",
    tumorType: specimen.tumorType || "", grade: specimen.grade || "", tnm: specimen.tnm || "",
    marginsStatus: specimen.marginsStatus || "",
    lymphNodesExamined: specimen.lymphNodesExamined?.toString() || "",
    lymphNodesPositive: specimen.lymphNodesPositive?.toString() || "",
    ihcResults: specimen.ihcResults || "",
    synopticReport: specimen.synopticReport || "",
    comment: specimen.comment || "",
  });
  function num(v: string): number | undefined { return v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined; }
  function submit() {
    if (!f.diagnosis) { alert("Diagnosis required"); return; }
    onSave({
      id: specimen.id,
      status: amending ? "amended" : "reported",
      grossedBy: f.grossedBy || undefined, signedOutBy: f.signedOutBy || undefined,
      grossDescription: f.grossDescription || undefined, dimensions: f.dimensions || undefined,
      weightG: num(f.weightG),
      microscopicDescription: f.microscopicDescription || undefined,
      diagnosis: f.diagnosis,
      malignancy: f.malignancy || undefined,
      tumorType: f.tumorType || undefined, grade: f.grade || undefined, tnm: f.tnm || undefined,
      marginsStatus: f.marginsStatus || undefined,
      lymphNodesExamined: num(f.lymphNodesExamined), lymphNodesPositive: num(f.lymphNodesPositive),
      ihcResults: f.ihcResults || undefined,
      synopticReport: f.synopticReport || undefined,
      comment: f.comment || undefined,
    });
  }
  return (
    <Modal title={`${amending ? "Amend" : "Sign out"} ${specimen.id} — ${TYPE_LABEL[specimen.specimenType]}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Grossed by"><input value={f.grossedBy} onChange={(e) => setF({ ...f, grossedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Signed out by"><input value={f.signedOutBy} onChange={(e) => setF({ ...f, signedOutBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Dimensions"><input value={f.dimensions} onChange={(e) => setF({ ...f, dimensions: e.target.value })} placeholder="5 × 3 × 2 cm" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Weight (g)"><input type="number" value={f.weightG} onChange={(e) => setF({ ...f, weightG: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        </div>
        <Field label="Gross description" full><textarea value={f.grossDescription} onChange={(e) => setF({ ...f, grossDescription: e.target.value })} rows={3} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Microscopic description" full><textarea value={f.microscopicDescription} onChange={(e) => setF({ ...f, microscopicDescription: e.target.value })} rows={3} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Diagnosis" full><textarea value={f.diagnosis} onChange={(e) => setF({ ...f, diagnosis: e.target.value })} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Malignancy">
            <select value={f.malignancy} onChange={(e) => setF({ ...f, malignancy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">—</option>{MALIGS.map((m) => <option key={m} value={m}>{MALIGNANCY_LABEL[m]}</option>)}</select>
          </Field>
          <Field label="Tumor type"><input value={f.tumorType} onChange={(e) => setF({ ...f, tumorType: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Grade"><input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="G1, Gleason 3+4=7" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="TNM"><input value={f.tnm} onChange={(e) => setF({ ...f, tnm: e.target.value })} placeholder="pT2N0M0" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Margins">
            <select value={f.marginsStatus} onChange={(e) => setF({ ...f, marginsStatus: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">—</option><option value="negative">Negative</option><option value="positive">Positive</option><option value="close">Close</option><option value="na">N/A</option></select>
          </Field>
          <Field label="LN examined"><input type="number" value={f.lymphNodesExamined} onChange={(e) => setF({ ...f, lymphNodesExamined: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="LN positive"><input type="number" value={f.lymphNodesPositive} onChange={(e) => setF({ ...f, lymphNodesPositive: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        </div>
        <Field label="IHC results" full><input value={f.ihcResults} onChange={(e) => setF({ ...f, ihcResults: e.target.value })} placeholder="ER+ 90%, PR+ 70%, HER2 2+ FISH-, Ki67 25%" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Synoptic report" full><textarea value={f.synopticReport} onChange={(e) => setF({ ...f, synopticReport: e.target.value })} rows={4} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono" /></Field>
        <Field label="Comment" full><textarea value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saveLabel={amending ? "Save amendment" : "Finalize report"} />
    </Modal>
  );
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}><div className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl ${wide ? "max-w-4xl" : "max-w-2xl"}`} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button></div><div className="p-5">{children}</div></div></div>;
}
function ModalActions({ onClose, onSave, saveLabel = "Save" }: { onClose: () => void; onSave: () => void; saveLabel?: string }) {
  return <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={onSave} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">{saveLabel}</button></div>;
}
function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block text-sm ${full ? "col-span-2" : ""}`}><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}
