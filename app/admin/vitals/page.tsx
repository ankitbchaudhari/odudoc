"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard as ShellStatCard } from "@/components/admin/PageShell";

export const dynamic = "force-dynamic";

type EwsLevel = "normal" | "low" | "medium" | "high";
type Consciousness = "alert" | "voice" | "pain" | "unresponsive";

interface Reading {
  id: string;
  patientId: string;
  admissionId?: string;
  takenAt: string;
  takenBy?: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureC?: number;
  spo2?: number;
  painScale?: number;
  gcs?: number;
  consciousness?: Consciousness;
  weightKg?: number;
  heightCm?: number;
  bloodGlucoseMgDl?: number;
  bmi?: number;
  ewsScore: number;
  ewsLevel: EwsLevel;
  notes?: string;
  createdAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const LEVEL_COLOR: Record<EwsLevel, string> = {
  normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
  low: "bg-sky-100 text-sky-700 border-sky-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function nowLocalISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VitalsPage() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | EwsLevel>("all");

  const [form, setForm] = useState({
    patientId: "",
    takenAt: nowLocalISO(),
    takenBy: "",
    systolicBp: "",
    diastolicBp: "",
    heartRate: "",
    respiratoryRate: "",
    temperatureC: "",
    spo2: "",
    painScale: "",
    gcs: "",
    consciousness: "alert" as Consciousness,
    weightKg: "",
    heightCm: "",
    bloodGlucoseMgDl: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      patientId: "",
      takenAt: nowLocalISO(),
      takenBy: "",
      systolicBp: "",
      diastolicBp: "",
      heartRate: "",
      respiratoryRate: "",
      temperatureC: "",
      spo2: "",
      painScale: "",
      gcs: "",
      consciousness: "alert",
      weightKg: "",
      heightCm: "",
      bloodGlucoseMgDl: "",
      notes: "",
    });
    setEditingId(null);
  };

  async function loadAll() {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        fetch("/api/hospital/vitals"),
        fetch("/api/patients"),
      ]);
      const r = await rRes.json();
      const p = await pRes.json();
      setReadings(r.readings || []);
      setPatients(p.patients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const patientLabel = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}${p.mrn ? ` (${p.mrn})` : ""}` : id;
  };

  const filtered = useMemo(() => {
    return readings.filter((r) => {
      if (patientFilter !== "all" && r.patientId !== patientFilter) return false;
      if (levelFilter !== "all" && r.ewsLevel !== levelFilter) return false;
      return true;
    });
  }, [readings, patientFilter, levelFilter]);

  const stats = useMemo(() => {
    return {
      total: readings.length,
      high: readings.filter((r) => r.ewsLevel === "high").length,
      medium: readings.filter((r) => r.ewsLevel === "medium").length,
      last24h: readings.filter(
        (r) =>
          Date.now() - new Date(r.takenAt).getTime() < 24 * 3600 * 1000
      ).length,
    };
  }, [readings]);

  function parseNum(s: string): number | undefined {
    const t = s.trim();
    if (!t) return undefined;
    const v = Number(t);
    return Number.isFinite(v) ? v : undefined;
  }

  async function submit() {
    const payload: any = {
      patientId: form.patientId,
      takenAt: form.takenAt ? new Date(form.takenAt).toISOString() : undefined,
      takenBy: form.takenBy || undefined,
      systolicBp: parseNum(form.systolicBp),
      diastolicBp: parseNum(form.diastolicBp),
      heartRate: parseNum(form.heartRate),
      respiratoryRate: parseNum(form.respiratoryRate),
      temperatureC: parseNum(form.temperatureC),
      spo2: parseNum(form.spo2),
      painScale: parseNum(form.painScale),
      gcs: parseNum(form.gcs),
      consciousness: form.consciousness,
      weightKg: parseNum(form.weightKg),
      heightCm: parseNum(form.heightCm),
      bloodGlucoseMgDl: parseNum(form.bloodGlucoseMgDl),
      notes: form.notes || undefined,
    };
    if (editingId) payload.id = editingId;

    const res = await fetch("/api/hospital/vitals", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      resetForm();
      setShowForm(false);
      loadAll();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed");
    }
  }

  function startEdit(r: Reading) {
    setEditingId(r.id);
    setShowForm(true);
    setForm({
      patientId: r.patientId,
      takenAt: r.takenAt.slice(0, 16),
      takenBy: r.takenBy || "",
      systolicBp: r.systolicBp?.toString() || "",
      diastolicBp: r.diastolicBp?.toString() || "",
      heartRate: r.heartRate?.toString() || "",
      respiratoryRate: r.respiratoryRate?.toString() || "",
      temperatureC: r.temperatureC?.toString() || "",
      spo2: r.spo2?.toString() || "",
      painScale: r.painScale?.toString() || "",
      gcs: r.gcs?.toString() || "",
      consciousness: r.consciousness || "alert",
      weightKg: r.weightKg?.toString() || "",
      heightCm: r.heightCm?.toString() || "",
      bloodGlucoseMgDl: r.bloodGlucoseMgDl?.toString() || "",
      notes: r.notes || "",
    });
  }

  async function del(id: string) {
    if (!confirm("Delete this reading?")) return;
    await fetch("/api/hospital/vitals", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadAll();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="❤️‍🔥"
        eyebrow="NEWS2"
        title="Vitals & Early Warning Score"
        subtitle="Timestamped observations with auto-computed NEWS2-style EWS and escalation tiers"
        tone="rose"
        primaryAction={{ label: showForm ? "Close" : "+ Record Vitals", onClick: () => { resetForm(); setShowForm(!showForm); } }}
      />

      <StatGrid cols={4}>
        <ShellStatCard label="Total readings" value={stats.total} tone="indigo" icon="📊" />
        <ShellStatCard label="High EWS" value={stats.high} tone={stats.high > 0 ? "rose" : "slate"} icon="🚨" />
        <ShellStatCard label="Medium EWS" value={stats.medium} tone={stats.medium > 0 ? "amber" : "slate"} icon="⚠️" />
        <ShellStatCard label="Last 24h" value={stats.last24h} tone="sky" icon="🕐" />
      </StatGrid>

      <div className="flex flex-wrap gap-3">
        <select
          className="input max-w-[240px]"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
        >
          <option value="all">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ""}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[180px]"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as any)}
        >
          <option value="all">All EWS levels</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {editingId ? "Edit reading" : "New vitals reading"}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Patient *" className="col-span-2">
              <select
                className="input"
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
              >
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Taken at *">
              <input
                type="datetime-local"
                className="input"
                value={form.takenAt}
                onChange={(e) =>
                  setForm({ ...form, takenAt: e.target.value })
                }
              />
            </Field>
            <Field label="Taken by">
              <input
                className="input"
                value={form.takenBy}
                onChange={(e) =>
                  setForm({ ...form, takenBy: e.target.value })
                }
                placeholder="Nurse name"
              />
            </Field>

            <Field label="Systolic BP">
              <input
                type="number"
                className="input"
                value={form.systolicBp}
                onChange={(e) =>
                  setForm({ ...form, systolicBp: e.target.value })
                }
                placeholder="mmHg"
              />
            </Field>
            <Field label="Diastolic BP">
              <input
                type="number"
                className="input"
                value={form.diastolicBp}
                onChange={(e) =>
                  setForm({ ...form, diastolicBp: e.target.value })
                }
                placeholder="mmHg"
              />
            </Field>
            <Field label="Heart rate">
              <input
                type="number"
                className="input"
                value={form.heartRate}
                onChange={(e) =>
                  setForm({ ...form, heartRate: e.target.value })
                }
                placeholder="bpm"
              />
            </Field>
            <Field label="Resp. rate">
              <input
                type="number"
                className="input"
                value={form.respiratoryRate}
                onChange={(e) =>
                  setForm({ ...form, respiratoryRate: e.target.value })
                }
                placeholder="/min"
              />
            </Field>

            <Field label="Temp (°C)">
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.temperatureC}
                onChange={(e) =>
                  setForm({ ...form, temperatureC: e.target.value })
                }
                placeholder="36.8"
              />
            </Field>
            <Field label="SpO2 (%)">
              <input
                type="number"
                className="input"
                value={form.spo2}
                onChange={(e) => setForm({ ...form, spo2: e.target.value })}
                placeholder="98"
              />
            </Field>
            <Field label="Pain (0-10)">
              <input
                type="number"
                min={0}
                max={10}
                className="input"
                value={form.painScale}
                onChange={(e) =>
                  setForm({ ...form, painScale: e.target.value })
                }
              />
            </Field>
            <Field label="GCS (3-15)">
              <input
                type="number"
                min={3}
                max={15}
                className="input"
                value={form.gcs}
                onChange={(e) => setForm({ ...form, gcs: e.target.value })}
              />
            </Field>

            <Field label="Consciousness (AVPU)">
              <select
                className="input"
                value={form.consciousness}
                onChange={(e) =>
                  setForm({
                    ...form,
                    consciousness: e.target.value as Consciousness,
                  })
                }
              >
                <option value="alert">Alert</option>
                <option value="voice">Responds to Voice</option>
                <option value="pain">Responds to Pain</option>
                <option value="unresponsive">Unresponsive</option>
              </select>
            </Field>
            <Field label="Weight (kg)">
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.weightKg}
                onChange={(e) =>
                  setForm({ ...form, weightKg: e.target.value })
                }
              />
            </Field>
            <Field label="Height (cm)">
              <input
                type="number"
                className="input"
                value={form.heightCm}
                onChange={(e) =>
                  setForm({ ...form, heightCm: e.target.value })
                }
              />
            </Field>
            <Field label="Glucose (mg/dL)">
              <input
                type="number"
                className="input"
                value={form.bloodGlucoseMgDl}
                onChange={(e) =>
                  setForm({ ...form, bloodGlucoseMgDl: e.target.value })
                }
              />
            </Field>

            <Field label="Notes" className="col-span-2 md:col-span-4">
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Post-op day 1, settled..."
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={submit}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {editingId ? "Save changes" : "Record reading"}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No vitals recorded. Click &ldquo;+ Record Vitals&rdquo; to start a chart.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-right">BP</th>
                  <th className="px-3 py-2 text-right">HR</th>
                  <th className="px-3 py-2 text-right">RR</th>
                  <th className="px-3 py-2 text-right">Temp</th>
                  <th className="px-3 py-2 text-right">SpO2</th>
                  <th className="px-3 py-2 text-right">Pain</th>
                  <th className="px-3 py-2 text-right">GCS</th>
                  <th className="px-3 py-2 text-right">Glucose</th>
                  <th className="px-3 py-2 text-center">EWS</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {fmtDate(r.takenAt)}
                      {r.takenBy && (
                        <div className="text-[10px] text-slate-400">
                          by {r.takenBy}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-800">
                      {patientLabel(r.patientId)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.systolicBp && r.diastolicBp
                        ? `${r.systolicBp}/${r.diastolicBp}`
                        : r.systolicBp || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.heartRate ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.respiratoryRate ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.temperatureC != null
                        ? `${r.temperatureC.toFixed(1)}°`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.spo2 != null ? `${r.spo2}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.painScale ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.gcs ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.bloodGlucoseMgDl ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${LEVEL_COLOR[r.ewsLevel]}`}
                        title={`Score: ${r.ewsScore}`}
                      >
                        {r.ewsScore} · {r.ewsLevel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => startEdit(r)}
                        className="mr-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(r.id)}
                        className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(15 23 42);
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(71 85 105);
          box-shadow: 0 0 0 2px rgb(148 163 184 / 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "red" | "amber" | "blue";
}) {
  const color =
    accent === "red"
      ? "text-red-700"
      : accent === "amber"
      ? "text-amber-700"
      : accent === "blue"
      ? "text-blue-700"
      : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
