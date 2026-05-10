"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";

type UnitStatus = "available" | "occupied" | "out_of_service" | "cleaning";
type CustodyStatus = "admitted" | "in_storage" | "autopsy_pending" | "autopsy_done" | "released";
type RecipientType = "next_of_kin" | "funeral_home" | "police" | "other";

interface Unit {
  id: string;
  unitCode: string;
  label: string;
  temperatureC?: number;
  temperatureRecordedAt?: string;
  status: UnitStatus;
  currentRecordId?: string;
  location?: string;
  notes?: string;
  active: boolean;
}

interface Record_ {
  id: string;
  recordNumber: string;
  patientId?: string;
  decedentName: string;
  decedentAge?: number;
  decedentGender?: "male" | "female" | "other";
  decedentAddress?: string;
  deathDateTime: string;
  deathLocation?: string;
  declaredBy?: string;
  causeOfDeath?: string;
  deathCertificateNumber?: string;
  isMedicoLegal: boolean;
  policeIntimationNumber?: string;
  policeStation?: string;
  firNumber?: string;
  autopsyRequired: boolean;
  autopsyDoneAt?: string;
  autopsyFindings?: string;
  embalmed: boolean;
  embalmedAt?: string;
  embalmedBy?: string;
  unitId?: string;
  admittedAt: string;
  admittedBy?: string;
  releasedAt?: string;
  releasedBy?: string;
  recipientType?: RecipientType;
  recipientName?: string;
  recipientRelation?: string;
  recipientIdProof?: string;
  recipientPhone?: string;
  status: CustodyStatus;
  notes?: string;
}

const UNIT_STATUSES: { v: UnitStatus; l: string; cls: string }[] = [
  { v: "available", l: "Available", cls: "bg-emerald-100 text-emerald-700" },
  { v: "occupied", l: "Occupied", cls: "bg-amber-100 text-amber-700" },
  { v: "cleaning", l: "Cleaning", cls: "bg-blue-100 text-blue-700" },
  { v: "out_of_service", l: "Out of service", cls: "bg-red-100 text-red-700" },
];

const CUSTODY_STATUSES: { v: CustodyStatus; l: string; cls: string }[] = [
  { v: "admitted", l: "Admitted", cls: "bg-slate-100 text-slate-700" },
  { v: "in_storage", l: "In storage", cls: "bg-amber-100 text-amber-700" },
  { v: "autopsy_pending", l: "Autopsy pending", cls: "bg-red-100 text-red-700" },
  { v: "autopsy_done", l: "Autopsy done", cls: "bg-blue-100 text-blue-700" },
  { v: "released", l: "Released", cls: "bg-emerald-100 text-emerald-700" },
];

const RECIPIENTS: { v: RecipientType; l: string }[] = [
  { v: "next_of_kin", l: "Next of kin" },
  { v: "funeral_home", l: "Funeral home" },
  { v: "police", l: "Police custody" },
  { v: "other", l: "Other" },
];

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}
function fmtDateTime(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}
function hoursSince(s?: string): number | null {
  if (!s) return null;
  const d = new Date(s).getTime();
  if (Number.isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 3600000);
}
function custodyPill(s: CustodyStatus): string {
  return CUSTODY_STATUSES.find((x) => x.v === s)?.cls || "";
}
function unitStatusPill(s: UnitStatus): string {
  return UNIT_STATUSES.find((x) => x.v === s)?.cls || "";
}

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MortuaryPage() {
  const [tab, setTab] = useState<"records" | "units">("records");
  const [records, setRecords] = useState<Record_[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Record form
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState<Record<string, string>>({});

  // Release form
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [releasingRecordId, setReleasingRecordId] = useState<string | null>(null);
  const [releaseForm, setReleaseForm] = useState<Record<string, string>>({});

  // Unit form
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState<Record<string, string>>({});

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [fStatus, setFStatus] = useState("");
  const [fMlc, setFMlc] = useState(false);
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fStatus) qs.set("status", fStatus);
      if (fMlc) qs.set("mlcOnly", "1");
      if (fFrom) qs.set("from", fFrom);
      if (fTo) qs.set("to", fTo);
      const [rRes, uRes] = await Promise.all([
        fetch(`/api/hospital/mortuary?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/hospital/mortuary/units`, { cache: "no-store" }),
      ]);
      if (rRes.ok) setRecords((await rRes.json()).records || []);
      if (uRes.ok) setUnits((await uRes.json()).units || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fStatus, fMlc, fFrom, fTo]);

  const unitMap = useMemo(() => {
    const m = new Map<string, Unit>();
    for (const u of units) m.set(u.id, u);
    return m;
  }, [units]);

  const stats = useMemo(() => {
    const inCustody = records.filter((r) => r.status !== "released").length;
    const autopsyPending = records.filter((r) => r.status === "autopsy_pending").length;
    const mlc = records.filter((r) => r.isMedicoLegal && r.status !== "released").length;
    const available = units.filter((u) => u.status === "available" && u.active).length;
    return { inCustody, autopsyPending, mlc, available };
  }, [records, units]);

  function openRecordForm(r?: Record_) {
    if (r) {
      setEditingRecordId(r.id);
      setRecordForm({
        decedentName: r.decedentName,
        decedentAge: r.decedentAge !== undefined ? String(r.decedentAge) : "",
        decedentGender: r.decedentGender || "",
        decedentAddress: r.decedentAddress || "",
        deathDateTime: toLocalInput(r.deathDateTime),
        deathLocation: r.deathLocation || "",
        declaredBy: r.declaredBy || "",
        causeOfDeath: r.causeOfDeath || "",
        deathCertificateNumber: r.deathCertificateNumber || "",
        isMedicoLegal: r.isMedicoLegal ? "1" : "0",
        policeIntimationNumber: r.policeIntimationNumber || "",
        policeStation: r.policeStation || "",
        firNumber: r.firNumber || "",
        autopsyRequired: r.autopsyRequired ? "1" : "0",
        autopsyFindings: r.autopsyFindings || "",
        embalmed: r.embalmed ? "1" : "0",
        embalmedBy: r.embalmedBy || "",
        unitId: r.unitId || "",
        admittedBy: r.admittedBy || "",
        status: r.status,
        notes: r.notes || "",
      });
    } else {
      setEditingRecordId(null);
      setRecordForm({
        deathDateTime: toLocalInput(new Date().toISOString()),
        isMedicoLegal: "0",
        autopsyRequired: "0",
        embalmed: "0",
        status: "in_storage",
      });
    }
    setShowRecordForm(true);
  }

  async function saveRecord() {
    if (!recordForm.decedentName?.trim()) {
      alert("Decedent name required");
      return;
    }
    const body: Record<string, unknown> = {
      decedentName: recordForm.decedentName,
      decedentAge: recordForm.decedentAge ? Number(recordForm.decedentAge) : undefined,
      decedentGender: recordForm.decedentGender || undefined,
      decedentAddress: recordForm.decedentAddress,
      deathDateTime: recordForm.deathDateTime ? new Date(recordForm.deathDateTime).toISOString() : undefined,
      deathLocation: recordForm.deathLocation,
      declaredBy: recordForm.declaredBy,
      causeOfDeath: recordForm.causeOfDeath,
      deathCertificateNumber: recordForm.deathCertificateNumber,
      isMedicoLegal: recordForm.isMedicoLegal === "1",
      policeIntimationNumber: recordForm.policeIntimationNumber,
      policeStation: recordForm.policeStation,
      firNumber: recordForm.firNumber,
      autopsyRequired: recordForm.autopsyRequired === "1",
      autopsyFindings: recordForm.autopsyFindings,
      embalmed: recordForm.embalmed === "1",
      embalmedBy: recordForm.embalmedBy,
      unitId: recordForm.unitId || undefined,
      admittedBy: recordForm.admittedBy,
      status: recordForm.status,
      notes: recordForm.notes,
    };
    const res = await fetch("/api/hospital/mortuary", {
      method: editingRecordId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingRecordId ? { id: editingRecordId, ...body } : body),
    });
    if (res.ok) {
      setShowRecordForm(false);
      setEditingRecordId(null);
      setRecordForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  function openReleaseForm(id: string) {
    setReleasingRecordId(id);
    setReleaseForm({ recipientType: "next_of_kin" });
    setShowReleaseForm(true);
  }

  async function saveRelease() {
    if (!releasingRecordId) return;
    if (!releaseForm.recipientName?.trim()) {
      alert("Recipient name is required");
      return;
    }
    const body = {
      id: releasingRecordId,
      status: "released",
      recipientType: releaseForm.recipientType,
      recipientName: releaseForm.recipientName,
      recipientRelation: releaseForm.recipientRelation,
      recipientIdProof: releaseForm.recipientIdProof,
      recipientPhone: releaseForm.recipientPhone,
      releasedBy: releaseForm.releasedBy,
    };
    const res = await fetch("/api/hospital/mortuary", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowReleaseForm(false);
      setReleasingRecordId(null);
      setReleaseForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function quickStatus(id: string, status: CustodyStatus) {
    await fetch("/api/hospital/mortuary", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function deleteRecord(id: string) {
    if (!confirm("Delete this custody record? This is a legal document — proceed?")) return;
    await fetch("/api/hospital/mortuary", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function openUnitForm(u?: Unit) {
    if (u) {
      setEditingUnitId(u.id);
      setUnitForm({
        label: u.label,
        temperatureC: u.temperatureC !== undefined ? String(u.temperatureC) : "",
        status: u.status,
        location: u.location || "",
        notes: u.notes || "",
        active: u.active ? "1" : "0",
      });
    } else {
      setEditingUnitId(null);
      setUnitForm({ status: "available", active: "1" });
    }
    setShowUnitForm(true);
  }

  async function saveUnit() {
    if (!unitForm.label?.trim()) { alert("Label required"); return; }
    const body: Record<string, unknown> = {
      label: unitForm.label,
      temperatureC: unitForm.temperatureC ? Number(unitForm.temperatureC) : undefined,
      status: unitForm.status,
      location: unitForm.location,
      notes: unitForm.notes,
      active: unitForm.active === "1",
    };
    const res = await fetch("/api/hospital/mortuary/units", {
      method: editingUnitId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingUnitId ? { id: editingUnitId, ...body } : body),
    });
    if (res.ok) {
      setShowUnitForm(false);
      setEditingUnitId(null);
      setUnitForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function deleteUnit(id: string) {
    if (!confirm("Delete this unit? (only works if empty)")) return;
    const res = await fetch("/api/hospital/mortuary/units", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🕯️"
        eyebrow="Custody & Release"
        title="Mortuary"
        subtitle="Body custody, refrigerated unit tracking, MLC / autopsy / embalming workflow and release chain-of-custody"
        tone="indigo"
        primaryAction={
          tab === "records"
            ? { label: "+ Admit Body", onClick: () => openRecordForm() }
            : { label: "+ Add Unit", onClick: () => openUnitForm() }
        }
      />

      <StatGrid cols={4}>
        <StatCard label="In custody" value={stats.inCustody} tone={stats.inCustody > 0 ? "amber" : "slate"} icon="📋" />
        <StatCard label="Autopsy pending" value={stats.autopsyPending} tone={stats.autopsyPending > 0 ? "rose" : "slate"} icon="🔬" />
        <StatCard label="Active MLC cases" value={stats.mlc} tone={stats.mlc > 0 ? "rose" : "violet"} icon="⚖️" />
        <StatCard label="Units available" value={stats.available} tone="emerald" icon="❄️" />
      </StatGrid>

      <div className="flex gap-1 border-b border-slate-200">
        {(["records", "units"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-primary-600 text-primary-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "records" ? "Custody Records" : "Refrigerated Units"}
          </button>
        ))}
      </div>

      {tab === "records" && (
        <Section>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Status">
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="inp">
                <option value="">All</option>
                {CUSTODY_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="From">
              <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="inp" />
            </Field>
            <Field label="To">
              <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="inp" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={fMlc} onChange={(e) => setFMlc(e.target.checked)} />
              MLC only
            </label>
            {(fStatus || fFrom || fTo || fMlc) && (
              <button onClick={() => { setFStatus(""); setFFrom(""); setFTo(""); setFMlc(false); }} className="text-sm text-slate-500 hover:text-slate-800">
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No mortuary records.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Record #</th>
                    <th className="py-2 pr-3">Admitted</th>
                    <th className="py-2 pr-3">Decedent</th>
                    <th className="py-2 pr-3">Unit</th>
                    <th className="py-2 pr-3">Flags</th>
                    <th className="py-2 pr-3">In custody</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => {
                    const unit = r.unitId ? unitMap.get(r.unitId) : undefined;
                    const isOpen = expandedId === r.id;
                    const hrs = r.status === "released"
                      ? null
                      : hoursSince(r.admittedAt);
                    return (
                      <Fragment key={r.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 pr-3 font-mono text-xs text-slate-600">{r.recordNumber}</td>
                          <td className="py-2 pr-3 text-slate-700">{fmtDateTime(r.admittedAt)}</td>
                          <td className="py-2 pr-3">
                            <div className="font-medium text-slate-800">{r.decedentName}</div>
                            <div className="text-[11px] text-slate-500">
                              {r.decedentAge !== undefined && <>{r.decedentAge}y · </>}
                              {r.decedentGender || "—"}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-slate-700">{unit?.label || "—"}</td>
                          <td className="py-2 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {r.isMedicoLegal && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">MLC</span>}
                              {r.autopsyRequired && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Autopsy</span>}
                              {r.embalmed && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Embalmed</span>}
                            </div>
                          </td>
                          <td className={`py-2 pr-3 text-[12px] ${hrs !== null && hrs > 48 ? "text-amber-700 font-semibold" : "text-slate-600"}`}>
                            {hrs === null ? "—" : hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d ${hrs % 24}h`}
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${custodyPill(r.status)}`}>
                              {CUSTODY_STATUSES.find((s) => s.v === r.status)?.l}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <div className="flex justify-end gap-1">
                              {r.status === "autopsy_pending" && (
                                <button onClick={() => quickStatus(r.id, "autopsy_done")} className="rounded bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-200">Autopsy done</button>
                              )}
                              {r.status !== "released" && (
                                <button onClick={() => openReleaseForm(r.id)} className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-200">Release</button>
                              )}
                              <button onClick={() => setExpandedId(isOpen ? null : r.id)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">{isOpen ? "Hide" : "Details"}</button>
                              <button onClick={() => openRecordForm(r)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">Edit</button>
                              <button onClick={() => deleteRecord(r.id)} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100">Delete</button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50 px-3 py-3">
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-3">
                                <KV label="Death date/time" value={fmtDateTime(r.deathDateTime)} />
                                <KV label="Death location" value={r.deathLocation || "—"} />
                                <KV label="Declared by" value={r.declaredBy || "—"} />
                                <KV label="Cause of death" value={r.causeOfDeath || "—"} />
                                <KV label="Death cert #" value={r.deathCertificateNumber || "—"} />
                                <KV label="Admitted by" value={r.admittedBy || "—"} />
                                {r.isMedicoLegal && (
                                  <>
                                    <KV label="Police intimation #" value={r.policeIntimationNumber || "—"} />
                                    <KV label="Police station" value={r.policeStation || "—"} />
                                    <KV label="FIR #" value={r.firNumber || "—"} />
                                  </>
                                )}
                                {r.autopsyRequired && (
                                  <>
                                    <KV label="Autopsy done at" value={fmtDateTime(r.autopsyDoneAt)} />
                                    {r.autopsyFindings && <KV label="Autopsy findings" value={r.autopsyFindings} />}
                                  </>
                                )}
                                {r.embalmed && (
                                  <>
                                    <KV label="Embalmed at" value={fmtDateTime(r.embalmedAt)} />
                                    <KV label="Embalmed by" value={r.embalmedBy || "—"} />
                                  </>
                                )}
                                {r.status === "released" && (
                                  <>
                                    <KV label="Released at" value={fmtDateTime(r.releasedAt)} />
                                    <KV label="Released by" value={r.releasedBy || "—"} />
                                    <KV label="Recipient" value={r.recipientName || "—"} />
                                    <KV label="Relation" value={r.recipientRelation || "—"} />
                                    <KV label="Recipient type" value={RECIPIENTS.find((x) => x.v === r.recipientType)?.l || "—"} />
                                    <KV label="ID proof" value={r.recipientIdProof || "—"} />
                                    <KV label="Phone" value={r.recipientPhone || "—"} />
                                  </>
                                )}
                                {r.decedentAddress && <KV label="Address" value={r.decedentAddress} />}
                                {r.notes && <KV label="Notes" value={r.notes} />}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "units" && (
        <Section>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : units.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No refrigerated units yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Label</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Temp (°C)</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Current body</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map((u) => {
                    const occupant = u.currentRecordId
                      ? records.find((r) => r.id === u.currentRecordId)
                      : undefined;
                    const tempAlert = u.temperatureC !== undefined && (u.temperatureC > 4 || u.temperatureC < -30);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-3 font-mono text-xs text-slate-600">{u.unitCode}</td>
                        <td className="py-2 pr-3 font-medium text-slate-800">{u.label}</td>
                        <td className="py-2 pr-3 text-slate-600">{u.location || "—"}</td>
                        <td className={`py-2 pr-3 text-slate-700 ${tempAlert ? "font-semibold text-red-700" : ""}`}>
                          {u.temperatureC !== undefined ? `${u.temperatureC}°C` : "—"}
                          {u.temperatureRecordedAt && (
                            <span className="ml-1 text-[10px] text-slate-400">({fmtDateTime(u.temperatureRecordedAt)})</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${unitStatusPill(u.status)}`}>
                            {UNIT_STATUSES.find((s) => s.v === u.status)?.l}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-700">{occupant?.decedentName || "—"}</td>
                        <td className="py-2 pr-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openUnitForm(u)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">Edit</button>
                            <button onClick={() => deleteUnit(u.id)} disabled={!!u.currentRecordId} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100 disabled:opacity-40">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* Record form */}
      {showRecordForm && (
        <Modal onClose={() => setShowRecordForm(false)} title={editingRecordId ? "Edit Custody Record" : "Admit Body"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Decedent name *">
              <input value={recordForm.decedentName || ""} onChange={(e) => setRecordForm({ ...recordForm, decedentName: e.target.value })} className="inp" />
            </Field>
            <Field label="Age">
              <input type="number" value={recordForm.decedentAge || ""} onChange={(e) => setRecordForm({ ...recordForm, decedentAge: e.target.value })} className="inp" />
            </Field>
            <Field label="Gender">
              <select value={recordForm.decedentGender || ""} onChange={(e) => setRecordForm({ ...recordForm, decedentGender: e.target.value })} className="inp">
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Address" span={2}>
              <input value={recordForm.decedentAddress || ""} onChange={(e) => setRecordForm({ ...recordForm, decedentAddress: e.target.value })} className="inp" />
            </Field>

            <Field label="Death date/time">
              <input type="datetime-local" value={recordForm.deathDateTime || ""} onChange={(e) => setRecordForm({ ...recordForm, deathDateTime: e.target.value })} className="inp" />
            </Field>
            <Field label="Death location">
              <input value={recordForm.deathLocation || ""} onChange={(e) => setRecordForm({ ...recordForm, deathLocation: e.target.value })} className="inp" placeholder="ICU-2 / ER" />
            </Field>
            <Field label="Declared by (doctor)">
              <input value={recordForm.declaredBy || ""} onChange={(e) => setRecordForm({ ...recordForm, declaredBy: e.target.value })} className="inp" />
            </Field>
            <Field label="Cause of death">
              <input value={recordForm.causeOfDeath || ""} onChange={(e) => setRecordForm({ ...recordForm, causeOfDeath: e.target.value })} className="inp" />
            </Field>
            <Field label="Death certificate #">
              <input value={recordForm.deathCertificateNumber || ""} onChange={(e) => setRecordForm({ ...recordForm, deathCertificateNumber: e.target.value })} className="inp" />
            </Field>
            <Field label="Admitted by">
              <input value={recordForm.admittedBy || ""} onChange={(e) => setRecordForm({ ...recordForm, admittedBy: e.target.value })} className="inp" />
            </Field>
            <Field label="Refrigerated unit">
              <select value={recordForm.unitId || ""} onChange={(e) => setRecordForm({ ...recordForm, unitId: e.target.value })} className="inp">
                <option value="">— Unassigned —</option>
                {units
                  .filter((u) => u.active && (u.status === "available" || u.id === recordForm.unitId))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.label} ({u.status})</option>
                  ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={recordForm.status || "in_storage"} onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value })} className="inp">
                {CUSTODY_STATUSES.filter((s) => s.v !== "released").map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>

            <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-red-700">
                <input type="checkbox" checked={recordForm.isMedicoLegal === "1"} onChange={(e) => setRecordForm({ ...recordForm, isMedicoLegal: e.target.checked ? "1" : "0" })} />
                Medico-legal case (MLC)
              </label>
              {recordForm.isMedicoLegal === "1" && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Field label="Police intimation #">
                    <input value={recordForm.policeIntimationNumber || ""} onChange={(e) => setRecordForm({ ...recordForm, policeIntimationNumber: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Police station">
                    <input value={recordForm.policeStation || ""} onChange={(e) => setRecordForm({ ...recordForm, policeStation: e.target.value })} className="inp" />
                  </Field>
                  <Field label="FIR #">
                    <input value={recordForm.firNumber || ""} onChange={(e) => setRecordForm({ ...recordForm, firNumber: e.target.value })} className="inp" />
                  </Field>
                </div>
              )}
            </div>

            <div className="col-span-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <input type="checkbox" checked={recordForm.autopsyRequired === "1"} onChange={(e) => setRecordForm({ ...recordForm, autopsyRequired: e.target.checked ? "1" : "0" })} />
                Autopsy required
              </label>
              {recordForm.autopsyRequired === "1" && (
                <Field label="Autopsy findings (if done)">
                  <textarea value={recordForm.autopsyFindings || ""} onChange={(e) => setRecordForm({ ...recordForm, autopsyFindings: e.target.value })} className="inp" rows={2} />
                </Field>
              )}
            </div>

            <div className="col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <input type="checkbox" checked={recordForm.embalmed === "1"} onChange={(e) => setRecordForm({ ...recordForm, embalmed: e.target.checked ? "1" : "0" })} />
                Embalmed
              </label>
              {recordForm.embalmed === "1" && (
                <Field label="Embalmed by">
                  <input value={recordForm.embalmedBy || ""} onChange={(e) => setRecordForm({ ...recordForm, embalmedBy: e.target.value })} className="inp" />
                </Field>
              )}
            </div>

            <Field label="Notes" span={2}>
              <textarea value={recordForm.notes || ""} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} className="inp" rows={2} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowRecordForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveRecord} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {editingRecordId ? "Save" : "Admit"}
            </button>
          </div>
        </Modal>
      )}

      {/* Release form */}
      {showReleaseForm && (
        <Modal onClose={() => setShowReleaseForm(false)} title="Release to recipient">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Recipient type">
              <select value={releaseForm.recipientType || "next_of_kin"} onChange={(e) => setReleaseForm({ ...releaseForm, recipientType: e.target.value })} className="inp">
                {RECIPIENTS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </Field>
            <Field label="Recipient name *">
              <input value={releaseForm.recipientName || ""} onChange={(e) => setReleaseForm({ ...releaseForm, recipientName: e.target.value })} className="inp" />
            </Field>
            <Field label="Relation">
              <input value={releaseForm.recipientRelation || ""} onChange={(e) => setReleaseForm({ ...releaseForm, recipientRelation: e.target.value })} className="inp" placeholder="Son / Daughter / Spouse" />
            </Field>
            <Field label="Phone">
              <input value={releaseForm.recipientPhone || ""} onChange={(e) => setReleaseForm({ ...releaseForm, recipientPhone: e.target.value })} className="inp" />
            </Field>
            <Field label="ID proof (type + number)" span={2}>
              <input value={releaseForm.recipientIdProof || ""} onChange={(e) => setReleaseForm({ ...releaseForm, recipientIdProof: e.target.value })} className="inp" placeholder="Aadhaar XXXX-XXXX-1234" />
            </Field>
            <Field label="Released by (staff)" span={2}>
              <input value={releaseForm.releasedBy || ""} onChange={(e) => setReleaseForm({ ...releaseForm, releasedBy: e.target.value })} className="inp" />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowReleaseForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveRelease} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Confirm release
            </button>
          </div>
        </Modal>
      )}

      {/* Unit form */}
      {showUnitForm && (
        <Modal onClose={() => setShowUnitForm(false)} title={editingUnitId ? "Edit Unit" : "Add Unit"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label *">
              <input value={unitForm.label || ""} onChange={(e) => setUnitForm({ ...unitForm, label: e.target.value })} className="inp" placeholder="Cooler-1 Drawer A" />
            </Field>
            <Field label="Temperature (°C)">
              <input type="number" step="0.1" value={unitForm.temperatureC || ""} onChange={(e) => setUnitForm({ ...unitForm, temperatureC: e.target.value })} className="inp" placeholder="-4" />
            </Field>
            <Field label="Status">
              <select value={unitForm.status || "available"} onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })} className="inp">
                {UNIT_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="Active">
              <select value={unitForm.active || "1"} onChange={(e) => setUnitForm({ ...unitForm, active: e.target.value })} className="inp">
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </Field>
            <Field label="Location" span={2}>
              <input value={unitForm.location || ""} onChange={(e) => setUnitForm({ ...unitForm, location: e.target.value })} className="inp" placeholder="Basement — Pathology" />
            </Field>
            <Field label="Notes" span={2}>
              <textarea value={unitForm.notes || ""} onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })} className="inp" rows={2} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowUnitForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveUnit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {editingUnitId ? "Save" : "Add unit"}
            </button>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 13px;
          background: white;
          color: rgb(15 23 42);
        }
        .inp:focus {
          outline: none;
          border-color: rgb(14 165 233);
          box-shadow: 0 0 0 3px rgb(186 230 253 / 0.4);
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "emerald" | "amber" | "red" | "blue" | "slate" }) {
  const toneCls: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    amber: "text-amber-700 bg-amber-50 ring-amber-200",
    red: "text-red-700 bg-red-50 ring-red-200",
    blue: "text-blue-700 bg-blue-50 ring-blue-200",
    slate: "text-slate-700 bg-slate-50 ring-slate-200",
  };
  return (
    <div className={`rounded-xl p-4 ring-1 ${toneCls[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5">{children}</div>;
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <label className={span === 2 ? "col-span-2 block" : "block"}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-[13px] text-slate-700">{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
