"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type AefiSeverity = "none" | "mild" | "moderate" | "severe";

interface Vaccine {
  id: string;
  name: string;
  code?: string;
  manufacturer?: string;
  doseCount: number;
  intervalsDays: number[];
  minAgeDays?: number;
  maxAgeDays?: number;
  notes?: string;
  active: boolean;
}

interface VaccineDose {
  id: string;
  patientId: string;
  vaccineId: string;
  vaccineName: string;
  doseNumber: number;
  administeredAt: string;
  lotNumber?: string;
  expiryDate?: string;
  route?: string;
  site?: string;
  administeredBy?: string;
  aefiSeverity: AefiSeverity;
  aefiDescription?: string;
  notes?: string;
}

interface ImmunizationStatus {
  vaccineId: string;
  vaccineName: string;
  doseCount: number;
  completedDoses: number;
  lastDoseAt?: string;
  nextDoseNumber?: number;
  nextDueAt?: string;
  overdue: boolean;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const AEFI_STYLE: Record<AefiSeverity, string> = {
  none: "bg-slate-100 text-slate-600",
  mild: "bg-amber-100 text-amber-700",
  moderate: "bg-orange-100 text-orange-700",
  severe: "bg-rose-100 text-rose-700",
};

export default function ImmunizationsPage() {
  const [tab, setTab] = useState<"doses" | "catalog">("doses");

  // Shared
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);

  async function loadShared() {
    const [pr, vr] = await Promise.all([
      fetch("/api/patients", { cache: "no-store" }),
      fetch("/api/hospital/vaccines", { cache: "no-store" }),
    ]);
    if (pr.ok) setPatients((await pr.json()).patients || []);
    if (vr.ok) setVaccines((await vr.json()).vaccines || []);
  }

  useEffect(() => {
    loadShared();
  }, []);

  return (
    <div className="space-y-6">
      <PageHero
        icon="💉"
        eyebrow="Preventive Care"
        title="Immunizations"
        subtitle="Vaccine catalog with multi-dose schedules, administered-dose tracking, auto due dates, and AEFI capture"
        tone="emerald"
      />

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          onClick={() => setTab("doses")}
          className={`flex-1 rounded-md px-4 py-1.5 font-medium transition-colors ${
            tab === "doses" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Patient Doses
        </button>
        <button
          onClick={() => setTab("catalog")}
          className={`flex-1 rounded-md px-4 py-1.5 font-medium transition-colors ${
            tab === "catalog" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Vaccine Catalog
        </button>
      </div>

      {tab === "doses" ? (
        <DosesTab patients={patients} vaccines={vaccines} />
      ) : (
        <CatalogTab vaccines={vaccines} reload={loadShared} />
      )}
    </div>
  );
}

// ─── Patient Doses Tab ──────────────────────────────────────────

function DosesTab({
  patients,
  vaccines,
}: {
  patients: Patient[];
  vaccines: Vaccine[];
}) {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [doses, setDoses] = useState<VaccineDose[]>([]);
  const [status, setStatus] = useState<ImmunizationStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VaccineDose | null>(null);
  const [draft, setDraft] = useState({
    vaccineId: "",
    doseNumber: 1,
    administeredAt: new Date().toISOString().slice(0, 10),
    lotNumber: "",
    expiryDate: "",
    route: "IM",
    site: "",
    administeredBy: "",
    aefiSeverity: "none" as AefiSeverity,
    aefiDescription: "",
    notes: "",
  });

  async function load() {
    if (!selectedPatient) {
      setDoses([]);
      setStatus([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hospital/immunizations?patientId=${encodeURIComponent(selectedPatient)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const d = await res.json();
        setDoses(d.doses || []);
        setStatus(d.status || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient]);

  function resetDraft() {
    setDraft({
      vaccineId: "",
      doseNumber: 1,
      administeredAt: new Date().toISOString().slice(0, 10),
      lotNumber: "",
      expiryDate: "",
      route: "IM",
      site: "",
      administeredBy: "",
      aefiSeverity: "none",
      aefiDescription: "",
      notes: "",
    });
    setEditing(null);
  }

  function openNewFor(vaccineId?: string, doseNumber?: number) {
    resetDraft();
    if (vaccineId) setDraft((d) => ({ ...d, vaccineId, doseNumber: doseNumber || 1 }));
    setShowForm(true);
  }

  function openEdit(dose: VaccineDose) {
    setEditing(dose);
    setDraft({
      vaccineId: dose.vaccineId,
      doseNumber: dose.doseNumber,
      administeredAt: dose.administeredAt.slice(0, 10),
      lotNumber: dose.lotNumber || "",
      expiryDate: dose.expiryDate ? dose.expiryDate.slice(0, 10) : "",
      route: dose.route || "",
      site: dose.site || "",
      administeredBy: dose.administeredBy || "",
      aefiSeverity: dose.aefiSeverity,
      aefiDescription: dose.aefiDescription || "",
      notes: dose.notes || "",
    });
    setShowForm(true);
  }

  async function submit() {
    if (!selectedPatient || !draft.vaccineId) return;
    if (editing) {
      const res = await fetch("/api/hospital/immunizations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...draft }),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        load();
      }
    } else {
      const res = await fetch("/api/hospital/immunizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatient, ...draft }),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        load();
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this dose record?")) return;
    const res = await fetch("/api/hospital/immunizations", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const overdueCount = status.filter((s) => s.overdue).length;
  const upcomingCount = status.filter((s) => !s.overdue && s.nextDueAt).length;
  const completeCount = status.filter((s) => s.completedDoses >= s.doseCount).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select a patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
        {selectedPatient && (
          <button
            onClick={() => openNewFor()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
          >
            + Record Dose
          </button>
        )}
      </div>

      {!selectedPatient ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Pick a patient to see their immunization schedule and dose history.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Overdue" value={overdueCount} tone="rose" />
            <Stat label="Upcoming" value={upcomingCount} tone="amber" />
            <Stat label="Complete series" value={completeCount} tone="emerald" />
          </div>

          {showForm && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                {editing ? "Edit Dose" : "Record Dose"}
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Vaccine *">
                  <select
                    value={draft.vaccineId}
                    onChange={(e) =>
                      setDraft({ ...draft, vaccineId: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    <option value="">Select…</option>
                    {vaccines.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.doseCount} dose{v.doseCount > 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Dose number">
                  <input
                    type="number"
                    min={1}
                    value={draft.doseNumber}
                    onChange={(e) =>
                      setDraft({ ...draft, doseNumber: Number(e.target.value) })
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Date administered">
                  <input
                    type="date"
                    value={draft.administeredAt}
                    onChange={(e) =>
                      setDraft({ ...draft, administeredAt: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Lot number">
                  <input
                    value={draft.lotNumber}
                    onChange={(e) =>
                      setDraft({ ...draft, lotNumber: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Lot expiry">
                  <input
                    type="date"
                    value={draft.expiryDate}
                    onChange={(e) =>
                      setDraft({ ...draft, expiryDate: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Route">
                  <select
                    value={draft.route}
                    onChange={(e) => setDraft({ ...draft, route: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    <option value="IM">IM (Intramuscular)</option>
                    <option value="SC">SC (Subcutaneous)</option>
                    <option value="ID">ID (Intradermal)</option>
                    <option value="Oral">Oral</option>
                    <option value="Intranasal">Intranasal</option>
                  </select>
                </Field>
                <Field label="Site">
                  <input
                    value={draft.site}
                    onChange={(e) => setDraft({ ...draft, site: e.target.value })}
                    placeholder="e.g. Left deltoid"
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Administered by">
                  <input
                    value={draft.administeredBy}
                    onChange={(e) =>
                      setDraft({ ...draft, administeredBy: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="AEFI severity">
                  <select
                    value={draft.aefiSeverity}
                    onChange={(e) =>
                      setDraft({ ...draft, aefiSeverity: e.target.value as AefiSeverity })
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    <option value="none">None</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </Field>
                {draft.aefiSeverity !== "none" && (
                  <Field label="AEFI description" span3>
                    <textarea
                      rows={2}
                      value={draft.aefiDescription}
                      onChange={(e) =>
                        setDraft({ ...draft, aefiDescription: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </Field>
                )}
                <Field label="Notes" span3>
                  <textarea
                    rows={2}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </Field>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetDraft();
                  }}
                  className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  {editing ? "Save" : "Record"}
                </button>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Immunization Schedule
            </div>
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Vaccine</th>
                  <th className="px-4 py-2 text-left">Progress</th>
                  <th className="px-4 py-2 text-left">Last dose</th>
                  <th className="px-4 py-2 text-left">Next due</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : status.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No active vaccines in catalog.
                    </td>
                  </tr>
                ) : (
                  status.map((s) => {
                    const complete = s.completedDoses >= s.doseCount;
                    return (
                      <tr key={s.vaccineId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {s.vaccineName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full ${complete ? "bg-emerald-500" : "bg-primary-500"}`}
                                style={{
                                  width: `${Math.round(
                                    (s.completedDoses / s.doseCount) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">
                              {s.completedDoses}/{s.doseCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {s.lastDoseAt
                            ? new Date(s.lastDoseAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {complete ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                              Complete
                            </span>
                          ) : s.nextDueAt ? (
                            <span
                              className={`rounded-full px-2 py-0.5 font-medium ${
                                s.overdue
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {new Date(s.nextDueAt).toLocaleDateString()}
                              {s.overdue && " (overdue)"}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Dose 1 — any time
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!complete && (
                            <button
                              onClick={() =>
                                openNewFor(s.vaccineId, s.nextDoseNumber)
                              }
                              className="rounded-md bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-200"
                            >
                              Record dose {s.nextDoseNumber}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Dose history */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dose History
            </div>
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Vaccine</th>
                  <th className="px-4 py-2 text-left">Dose</th>
                  <th className="px-4 py-2 text-left">Lot</th>
                  <th className="px-4 py-2 text-left">Route / Site</th>
                  <th className="px-4 py-2 text-left">AEFI</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {doses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No doses recorded yet.
                    </td>
                  </tr>
                ) : (
                  doses.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(d.administeredAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{d.vaccineName}</td>
                      <td className="px-4 py-3 text-slate-700">#{d.doseNumber}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {d.lotNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {[d.route, d.site].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${AEFI_STYLE[d.aefiSeverity]}`}
                        >
                          {d.aefiSeverity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(d)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(d.id)}
                          className="ml-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Vaccine Catalog Tab ────────────────────────────────────────

function CatalogTab({
  vaccines,
  reload,
}: {
  vaccines: Vaccine[];
  reload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vaccine | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    code: "",
    manufacturer: "",
    doseCount: 1,
    intervalsText: "",
    notes: "",
    active: true,
  });

  function resetDraft() {
    setDraft({
      name: "",
      code: "",
      manufacturer: "",
      doseCount: 1,
      intervalsText: "",
      notes: "",
      active: true,
    });
    setEditing(null);
  }

  function openNew() {
    resetDraft();
    setShowForm(true);
  }

  function openEdit(v: Vaccine) {
    setEditing(v);
    setDraft({
      name: v.name,
      code: v.code || "",
      manufacturer: v.manufacturer || "",
      doseCount: v.doseCount,
      intervalsText: v.intervalsDays.join(", "),
      notes: v.notes || "",
      active: v.active,
    });
    setShowForm(true);
  }

  async function submit() {
    if (!draft.name.trim()) return;
    const intervals = draft.intervalsText
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    const payload = {
      name: draft.name,
      code: draft.code,
      manufacturer: draft.manufacturer,
      doseCount: draft.doseCount,
      intervalsDays: intervals,
      notes: draft.notes,
      active: draft.active,
    };
    if (editing) {
      const res = await fetch("/api/hospital/vaccines", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...payload }),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        reload();
      }
    } else {
      const res = await fetch("/api/hospital/vaccines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        reload();
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this vaccine? Existing dose records are preserved but orphaned.")) return;
    const res = await fetch("/api/hospital/vaccines", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) reload();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
        >
          + Add Vaccine
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? "Edit Vaccine" : "New Vaccine"}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Name *">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Code">
              <input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="CVX or internal code"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Manufacturer">
              <input
                value={draft.manufacturer}
                onChange={(e) =>
                  setDraft({ ...draft, manufacturer: e.target.value })
                }
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Doses in series">
              <input
                type="number"
                min={1}
                value={draft.doseCount}
                onChange={(e) =>
                  setDraft({ ...draft, doseCount: Math.max(1, Number(e.target.value)) })
                }
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Intervals (days, comma-separated)" span2>
              <input
                value={draft.intervalsText}
                onChange={(e) =>
                  setDraft({ ...draft, intervalsText: e.target.value })
                }
                placeholder={
                  draft.doseCount > 1
                    ? `e.g. ${Array(draft.doseCount - 1).fill(28).join(", ")} (${draft.doseCount - 1} value${draft.doseCount > 2 ? "s" : ""})`
                    : "Single dose — no intervals"
                }
                disabled={draft.doseCount <= 1}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50"
              />
            </Field>
            <Field label="Notes" span3>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Active">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) =>
                    setDraft({ ...draft, active: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                In active use
              </label>
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                resetDraft();
              }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {editing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Vaccine</th>
              <th className="px-4 py-2.5 text-left">Code</th>
              <th className="px-4 py-2.5 text-left">Manufacturer</th>
              <th className="px-4 py-2.5 text-left">Doses</th>
              <th className="px-4 py-2.5 text-left">Intervals (days)</th>
              <th className="px-4 py-2.5 text-left">Active</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {vaccines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No vaccines in catalog. Add one to get started.
                </td>
              </tr>
            ) : (
              vaccines.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{v.code || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.manufacturer || "—"}</td>
                  <td className="px-4 py-3">{v.doseCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {v.intervalsDays.length ? v.intervalsDays.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        v.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {v.active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(v)}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(v.id)}
                      className="ml-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const t: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${t[tone]}`}>{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
  span2,
  span3,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
  span3?: boolean;
}) {
  return (
    <div className={span3 ? "md:col-span-3" : span2 ? "md:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
