"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type { Admission } from "@/lib/hospital/admissions-store";
import type { Ward, Bed } from "@/lib/hospital/wards-store";
import type { Patient } from "@/lib/patients-store";

type AdmissionRow = Admission & { roomChargeEstimate: number };

const DISPOSITIONS = [
  "home",
  "transferred",
  "lama",
  "expired",
  "referred",
  "other",
] as const;

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    bedId: "",
    admittingDoctor: "",
    admittingDepartment: "",
    chiefComplaint: "",
    provisionalDiagnosis: "",
    notes: "",
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: "discharge" | "transfer"; id: string } | null>(null);
  const [dischargeForm, setDischargeForm] = useState({
    dischargeSummary: "",
    finalDiagnosis: "",
    dischargeDisposition: "home" as (typeof DISPOSITIONS)[number],
  });
  const [transferBed, setTransferBed] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      if (filterStatus) q.set("status", filterStatus);
      const [aRes, wRes, pRes] = await Promise.all([
        fetch(`/api/hospital/admissions?${q.toString()}`, { cache: "no-store" }),
        fetch("/api/hospital/wards", { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
      ]);
      const a = await aRes.json();
      const w = await wRes.json();
      const p = await pRes.json();
      if (!aRes.ok) throw new Error(a.error || "load_failed");
      setAdmissions(a.admissions || []);
      setWards(w.wards || []);
      setPatients(p.patients || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach((p) => m.set(p.id, p));
    return m;
  }, [patients]);

  const bedMap = useMemo(() => {
    const m = new Map<string, { ward: Ward; bed: Bed }>();
    for (const w of wards) for (const b of w.beds) m.set(b.id, { ward: w, bed: b });
    return m;
  }, [wards]);

  const availableBeds = useMemo(() => {
    const out: Array<{ ward: Ward; bed: Bed }> = [];
    for (const w of wards) for (const b of w.beds) if (b.status === "available") out.push({ ward: w, bed: b });
    return out;
  }, [wards]);

  function reset() {
    setForm({
      patientId: "",
      bedId: "",
      admittingDoctor: "",
      admittingDepartment: "",
      chiefComplaint: "",
      provisionalDiagnosis: "",
      notes: "",
    });
    setShowForm(false);
  }

  async function admit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId || !form.bedId) {
      alert("Patient and bed required");
      return;
    }
    const res = await fetch("/api/hospital/admissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    reset();
    load();
  }

  async function discharge() {
    if (!modal) return;
    const res = await fetch("/api/hospital/admissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: modal.id, discharge: dischargeForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    setModal(null);
    setDischargeForm({ dischargeSummary: "", finalDiagnosis: "", dischargeDisposition: "home" });
    load();
  }

  async function transfer() {
    if (!modal || !transferBed) {
      alert("Pick a target bed");
      return;
    }
    const res = await fetch("/api/hospital/admissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: modal.id, transferBedId: transferBed }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    setModal(null);
    setTransferBed("");
    load();
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this admission? Bed will be freed.")) return;
    const res = await fetch("/api/hospital/admissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, cancel: true }),
    });
    if (res.ok) load();
  }

  const activeCount = admissions.filter((a) => a.status === "admitted").length;

  return (
    <div className="space-y-6">
      <PageHero
        icon="🛏️"
        eyebrow="In-Patient"
        title="Admissions (IPD)"
        subtitle="In-patient admissions with bed transfers, room-charge estimation, and discharge"
        tone="indigo"
        primaryAction={{ label: showForm ? "Close" : "+ Admit patient", onClick: () => (showForm ? reset() : setShowForm(true)) }}
      />

      <StatGrid cols={4}>
        <StatCard label="Total admissions" value={admissions.length} tone="indigo" icon="📊" />
        <StatCard label="Currently admitted" value={activeCount} tone={activeCount > 0 ? "rose" : "slate"} icon="🛌" />
        <StatCard label="Available beds" value={availableBeds.length} tone="emerald" icon="🟢" />
        <StatCard label="Wards" value={wards.length} tone="violet" icon="🏥" />
      </StatGrid>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      {showForm && (
        <form onSubmit={admit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Admit patient</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Patient*">
              <select required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="input">
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </Field>
            <Field label="Bed*">
              <select required value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })} className="input">
                <option value="">— select —</option>
                {availableBeds.map(({ ward, bed }) => (
                  <option key={bed.id} value={bed.id}>
                    {ward.name} / {bed.bedNumber} (₹{bed.dailyRate ?? ward.dailyRate}/day)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Admitting doctor">
              <input value={form.admittingDoctor} onChange={(e) => setForm({ ...form, admittingDoctor: e.target.value })} className="input" />
            </Field>
            <Field label="Department">
              <input value={form.admittingDepartment} onChange={(e) => setForm({ ...form, admittingDepartment: e.target.value })} className="input" />
            </Field>
            <Field label="Chief complaint">
              <input value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} className="input" />
            </Field>
            <Field label="Provisional diagnosis">
              <input value={form.provisionalDiagnosis} onChange={(e) => setForm({ ...form, provisionalDiagnosis: e.target.value })} className="input" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
              </Field>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">Admit</button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Status">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
            <option value="">All</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <button onClick={load} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">Apply</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Bed</th>
              <th className="px-4 py-3">Admitted</th>
              <th className="px-4 py-3">Room charge</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : admissions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No admissions.</td></tr>
            ) : (
              admissions.map((a) => {
                const p = patientMap.get(a.patientId);
                const bed = a.currentBedId ? bedMap.get(a.currentBedId) : null;
                const isOpen = expanded === a.id;
                return (
                  <>
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {p ? `${p.firstName} ${p.lastName}` : a.patientId}
                        </div>
                        {a.admittingDoctor && <div className="text-[11px] text-slate-500">Dr. {a.admittingDoctor}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {bed ? (
                          <div>
                            <div className="font-mono text-xs">{bed.bed.bedNumber}</div>
                            <div className="text-[11px] text-slate-500">{bed.ward.name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(a.admittedAt).toLocaleDateString()}
                        <div className="text-[11px] text-slate-500">
                          {a.dischargedAt ? `→ ${new Date(a.dischargedAt).toLocaleDateString()}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₹{a.roomChargeEstimate.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          a.status === "admitted" ? "bg-red-100 text-red-700" :
                          a.status === "discharged" ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-200 text-slate-600"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => setExpanded(isOpen ? null : a.id)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            {isOpen ? "Hide" : "View"}
                          </button>
                          {a.status === "admitted" && (
                            <>
                              <button
                                onClick={() => { setModal({ type: "transfer", id: a.id }); setTransferBed(""); }}
                                className="rounded-md bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700"
                              >
                                Transfer
                              </button>
                              <button
                                onClick={() => setModal({ type: "discharge", id: a.id })}
                                className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                              >
                                Discharge
                              </button>
                              <button
                                onClick={() => cancel(a.id)}
                                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={a.id + "-d"} className="bg-slate-50/50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <div className="text-[11px] font-semibold uppercase text-slate-500">Clinical</div>
                              <div className="mt-1 text-sm"><b>Chief complaint:</b> {a.chiefComplaint || "—"}</div>
                              <div className="text-sm"><b>Provisional dx:</b> {a.provisionalDiagnosis || "—"}</div>
                              {a.finalDiagnosis && <div className="text-sm"><b>Final dx:</b> {a.finalDiagnosis}</div>}
                              {a.dischargeSummary && <div className="text-sm"><b>Summary:</b> {a.dischargeSummary}</div>}
                              {a.dischargeDisposition && <div className="text-sm"><b>Disposition:</b> {a.dischargeDisposition}</div>}
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase text-slate-500">Bed history</div>
                              <ul className="mt-1 space-y-1 text-xs">
                                {a.history.map((h, i) => {
                                  const bd = bedMap.get(h.bedId);
                                  return (
                                    <li key={i}>
                                      {bd ? `${bd.ward.name} / ${bd.bed.bedNumber}` : h.bedId}
                                      {" — "}
                                      {new Date(h.from).toLocaleDateString()}
                                      {h.to ? ` → ${new Date(h.to).toLocaleDateString()}` : " (current)"}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                          {a.notes && <div className="mt-3 text-xs text-slate-600"><b>Notes:</b> {a.notes}</div>}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal?.type === "discharge" && (
        <Modal title="Discharge patient" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Final diagnosis">
              <input
                value={dischargeForm.finalDiagnosis}
                onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Discharge summary">
              <textarea
                value={dischargeForm.dischargeSummary}
                onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeSummary: e.target.value })}
                className="input min-h-[80px]"
              />
            </Field>
            <Field label="Disposition">
              <select
                value={dischargeForm.dischargeDisposition}
                onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDisposition: e.target.value as (typeof DISPOSITIONS)[number] })}
                className="input"
              >
                {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <div className="flex gap-2">
              <button onClick={discharge} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Discharge</button>
              <button onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === "transfer" && (
        <Modal title="Transfer bed" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="New bed">
              <select value={transferBed} onChange={(e) => setTransferBed(e.target.value)} className="input">
                <option value="">— select —</option>
                {availableBeds.map(({ ward, bed }) => (
                  <option key={bed.id} value={bed.id}>
                    {ward.name} / {bed.bedNumber} (₹{bed.dailyRate ?? ward.dailyRate}/day)
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <button onClick={transfer} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white">Transfer</button>
              <button onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
