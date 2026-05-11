"use client";

// Pharma drug catalogue admin.
//
// List + create + add batch + attach (regulatory paper / lab report
// / packaging photo) + activate/deactivate. All scoped to the active
// org (read from localStorage as elsewhere).

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type Form = "tablet" | "capsule" | "syrup" | "injection" | "topical" | "inhaler" | "drops" | "patch" | "other";
type Schedule = "OTC" | "H" | "H1" | "X" | "G" | "K";

interface Batch { batchNumber: string; manufacturedOn: string; expiresOn: string; notes?: string }
interface Attachment { kind: "regulatory_paper" | "batch_lab_report" | "packaging_photo" | "other"; title: string; data: string; mimeType: string; uploadedAt: string }
interface Drug {
  id: string; organizationId: string;
  brandName: string; genericName: string; composition: string;
  form: Form; strength: string; scheduleClass: Schedule;
  manufacturerLicense: string; countryIso2: string;
  batches: Batch[]; attachments: Attachment[];
  active: boolean; updatedAt: string;
}

const FORMS: Form[] = ["tablet", "capsule", "syrup", "injection", "topical", "inhaler", "drops", "patch", "other"];
const SCHEDULES: Schedule[] = ["OTC", "H", "H1", "X", "G", "K"];

export default function DrugsAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const r = await fetch(`/api/pharma/drugs?orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setDrugs(d.drugs || []);
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const setActive = async (id: string, active: boolean) => {
    await fetch("/api/pharma/drugs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_active", id, active }),
    });
    load();
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div className="space-y-6">
      <PageHero
        icon="💊"
        eyebrow="Pharma Catalogue"
        title="Drug Catalogue"
        subtitle="Register each SKU + batches + regulatory papers. Doctors verify against this before prescribing."
        tone="violet"
        primaryAction={{
          label: showForm ? "Cancel" : "+ New SKU",
          onClick: () => setShowForm((v) => !v),
        }}
      />

      {showForm && <DrugForm orgId={orgId} onSaved={() => { setShowForm(false); load(); }} />}

      {drugs.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No drugs registered yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {drugs.map((d) => {
            const isOpen = expanded === d.id;
            return (
              <li key={d.id} className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${!d.active ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{d.brandName}</p>
                      <span className="text-xs text-slate-500">· {d.genericName}</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800">{d.scheduleClass}</span>
                      <span className="text-[10px] text-slate-400">{d.form} · {d.strength}</span>
                    </div>
                    <p className="text-xs text-slate-500">{d.composition}</p>
                    <p className="text-[10px] text-slate-400">License {d.manufacturerLicense} · {d.countryIso2} · {d.batches.length} batch · {d.attachments.length} attachments</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setExpanded(isOpen ? null : d.id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {isOpen ? "Close" : "Open"}
                    </button>
                    <button onClick={() => setActive(d.id, !d.active)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300">
                      {d.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
                {isOpen && <DrugDetail drug={d} onChange={load} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DrugForm({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [s, setS] = useState({
    brandName: "", genericName: "", composition: "",
    form: "tablet" as Form, strength: "", scheduleClass: "H" as Schedule,
    manufacturerLicense: "", countryIso2: "IN",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!s.brandName.trim() || !s.genericName.trim()) { setError("Brand + generic required."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/pharma/drugs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", organizationId: orgId, ...s }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || "Failed"); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">New drug SKU</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <I label="Brand name" v={s.brandName} on={(v) => setS({ ...s, brandName: v })} />
        <I label="Generic name" v={s.genericName} on={(v) => setS({ ...s, genericName: v })} />
        <I label="Composition" v={s.composition} on={(v) => setS({ ...s, composition: v })} placeholder="Paracetamol 500 mg + Caffeine 30 mg" />
        <I label="Strength" v={s.strength} on={(v) => setS({ ...s, strength: v })} placeholder="500 mg" />
        <S label="Form" v={s.form} on={(v) => setS({ ...s, form: v as Form })} options={FORMS} />
        <S label="Schedule class" v={s.scheduleClass} on={(v) => setS({ ...s, scheduleClass: v as Schedule })} options={SCHEDULES} />
        <I label="Manufacturer license" v={s.manufacturerLicense} on={(v) => setS({ ...s, manufacturerLicense: v })} />
        <I label="Country (ISO-2)" v={s.countryIso2} on={(v) => setS({ ...s, countryIso2: v })} />
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Register SKU"}
        </button>
      </div>
    </div>
  );
}

function DrugDetail({ drug, onChange }: { drug: Drug; onChange: () => void }) {
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturedOn, setManufacturedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachKind, setAttachKind] = useState<Attachment["kind"]>("regulatory_paper");
  const [attachTitle, setAttachTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const addBatch = async () => {
    if (!batchNumber.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/pharma/drugs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_batch", id: drug.id, batch: { batchNumber: batchNumber.trim(), manufacturedOn, expiresOn } }),
      });
      setBatchNumber(""); setManufacturedOn(""); setExpiresOn("");
      onChange();
    } finally { setBusy(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !attachTitle.trim()) return;
    setBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      await fetch("/api/pharma/drugs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attach", id: drug.id,
          attachment: { kind: attachKind, title: attachTitle.trim(), data, mimeType: f.type || "application/octet-stream" },
        }),
      });
      setAttachTitle("");
      if (fileRef.current) fileRef.current.value = "";
      onChange();
    } finally { setBusy(false); }
  };

  return (
    <div className="border-t border-slate-100 px-4 py-4 text-xs">
      {/* Batches */}
      <div className="mb-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Batches</p>
        {drug.batches.length === 0 ? <p className="text-slate-400">None registered.</p> : (
          <ul className="space-y-1">
            {drug.batches.map((b) => (
              <li key={b.batchNumber} className="rounded bg-slate-50 px-2 py-1">
                <b className="text-slate-900">#{b.batchNumber}</b>
                {b.manufacturedOn && <span className="ml-2 text-slate-500">mfg {b.manufacturedOn}</span>}
                {b.expiresOn && <span className="ml-2 text-slate-500">exp {b.expiresOn}</span>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Batch number" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
          <input type="date" value={manufacturedOn} onChange={(e) => setManufacturedOn(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
          <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
          <button onClick={addBatch} disabled={busy || !batchNumber.trim()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">Add batch</button>
        </div>
      </div>

      {/* Attachments */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Attachments</p>
        {drug.attachments.length === 0 ? <p className="text-slate-400">None uploaded.</p> : (
          <ul className="space-y-1">
            {drug.attachments.map((a, i) => (
              <li key={i} className="rounded bg-slate-50 px-2 py-1">
                <b className="text-slate-900">{a.title}</b>
                <span className="ml-2 text-slate-500">{a.kind.replace(/_/g, " ")}</span>
                <span className="ml-2 text-slate-400">{a.mimeType}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select value={attachKind} onChange={(e) => setAttachKind(e.target.value as Attachment["kind"])} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <option value="regulatory_paper">Regulatory paper</option>
            <option value="batch_lab_report">Batch lab report</option>
            <option value="packaging_photo">Packaging photo</option>
            <option value="other">Other</option>
          </select>
          <input value={attachTitle} onChange={(e) => setAttachTitle(e.target.value)} placeholder="Title (e.g. Batch B23-Q1 lab)" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm sm:col-span-2" />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={busy || !attachTitle.trim()} className="text-sm" />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">Up to 256 KB per attachment. PDF or image.</p>
      </div>
    </div>
  );
}

function I({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) {
  return <label className="text-xs font-semibold text-slate-700">{label}<input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
function S({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: string[] }) {
  return <label className="text-xs font-semibold text-slate-700">{label}<select value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
