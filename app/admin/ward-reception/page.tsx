// Ward Reception — central coordination tool for in-hospital patient
// management per Ecosystem Spec §5.3.
//
// Shows all IPD encounters grouped by ward (encounter.department), with
// per-patient assigned doctor, vitals snapshot, status pill, and quick
// actions: shift handover, specialist call, transfer to ICU, discharge.

"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard, EmptyState } from "@/components/admin/PageShell";
import { StatusBadge, type StatusColor } from "@/components/admin/StatusBadge";
import type { Encounter, Vitals } from "@/lib/encounters-store";

type SpecialistCall = {
  toSpecialty: string;
  reason: string;
};

function vitalsStatus(v: Vitals | undefined): StatusColor {
  if (!v) return "white";
  // Spec §7.1 thresholds — abbreviated.
  if (v.spo2 != null && v.spo2 < 90) return "red";
  if (v.heartRate != null && (v.heartRate < 40 || v.heartRate > 150)) return "red";
  if (v.respiratoryRate != null && (v.respiratoryRate < 8 || v.respiratoryRate > 30)) return "red";
  if (v.temperatureC != null && (v.temperatureC < 35 || v.temperatureC > 39.5)) return "orange";
  if (v.painScore != null && v.painScore >= 8) return "orange";
  if (v.bloodPressure) {
    const [sys, dia] = v.bloodPressure.split("/").map((n) => parseInt(n, 10));
    if (sys && (sys < 80 || sys > 180)) return "red";
    if (dia && (dia < 50 || dia > 120)) return "orange";
  }
  if (v.spo2 != null && v.spo2 < 95) return "yellow";
  return "green";
}

function vitalsSummary(v: Vitals | undefined): string {
  if (!v) return "No vitals recorded";
  const parts: string[] = [];
  if (v.bloodPressure) parts.push(`BP ${v.bloodPressure}`);
  if (v.heartRate != null) parts.push(`HR ${v.heartRate}`);
  if (v.spo2 != null) parts.push(`SpO₂ ${v.spo2}%`);
  if (v.temperatureC != null) parts.push(`T ${v.temperatureC}°C`);
  return parts.join(" · ") || "—";
}

export default function WardReceptionPage() {
  const [encs, setEncs] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [callOpen, setCallOpen] = useState<string | null>(null);
  const [callForm, setCallForm] = useState<SpecialistCall>({ toSpecialty: "", reason: "" });
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/encounters?type=ipd&status=open", { cache: "no-store" });
      if (!r.ok) {
        if (r.status === 400 || r.status === 403) {
          setErr("Pick an organization from the header.");
          setEncs([]);
          return;
        }
        throw new Error(`HTTP ${r.status}`);
      }
      const data = await r.json();
      setEncs(data.encounters ?? []);
    } catch {
      setErr("Failed to load IPD encounters.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  const wards = useMemo(() => {
    const set = new Set<string>();
    for (const e of encs) set.add(e.department || "Unassigned");
    return ["all", ...Array.from(set).sort()];
  }, [encs]);

  const filtered = useMemo(() => {
    if (selectedWard === "all") return encs;
    return encs.filter((e) => (e.department || "Unassigned") === selectedWard);
  }, [encs, selectedWard]);

  const grouped = useMemo(() => {
    const m = new Map<string, Encounter[]>();
    for (const e of filtered) {
      const w = e.department || "Unassigned";
      if (!m.has(w)) m.set(w, []);
      m.get(w)!.push(e);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = useMemo(() => {
    let critical = 0, urgent = 0, stable = 0;
    for (const e of filtered) {
      const s = vitalsStatus(e.vitals);
      if (s === "red") critical++;
      else if (s === "orange" || s === "yellow") urgent++;
      else if (s === "green") stable++;
    }
    return { critical, urgent, stable };
  }, [filtered]);

  async function patchEncounter(id: string, patch: Partial<Encounter>) {
    setSaving(true);
    try {
      const r = await fetch("/api/encounters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!r.ok) throw new Error();
      await reload();
    } catch {
      alert("Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function submitSpecialistCall(encId: string) {
    if (!callForm.toSpecialty.trim()) return;
    const enc = encs.find((e) => e.id === encId);
    const note = `[${new Date().toLocaleString()}] SPECIALIST CALL → ${callForm.toSpecialty}: ${callForm.reason || "(no reason given)"}`;
    await patchEncounter(encId, {
      notes: enc?.notes ? `${enc.notes}\n${note}` : note,
    });
    setCallOpen(null);
    setCallForm({ toSpecialty: "", reason: "" });
  }

  async function transferToICU(enc: Encounter) {
    if (!confirm(`Transfer ${enc.patientId} from ${enc.department || "ward"} to ICU?`)) return;
    const note = `[${new Date().toLocaleString()}] TRANSFERRED to ICU from ${enc.department || "ward"}`;
    await patchEncounter(enc.id, {
      department: "ICU",
      notes: enc.notes ? `${enc.notes}\n${note}` : note,
    });
  }

  async function discharge(enc: Encounter) {
    if (!confirm(`Discharge encounter for ${enc.patientId}?`)) return;
    await patchEncounter(enc.id, { status: "closed", closedAt: new Date().toISOString() });
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🏥"
        eyebrow="Hospital Operations"
        title="Ward Reception"
        subtitle="Central coordination for in-hospital patient management — assignments, specialist calls, transfers, shift handover."
        tone="indigo"
      />

      {err && (
        <p className="admin-empty-callout">{err}</p>
      )}

      {!err && (
        <>
          <StatGrid label="Live status across selected wards" cols={4}>
            <StatCard label="Open IPD encounters" value={filtered.length} tone="indigo" />
            <StatCard label="Critical 🔴" value={stats.critical} tone="rose" />
            <StatCard label="Urgent 🟠" value={stats.urgent} tone="amber" />
            <StatCard label="Stable 🟢" value={stats.stable} tone="emerald" />
          </StatGrid>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ward</span>
            {wards.map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWard(w)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedWard === w
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {w === "all" ? "All wards" : w}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🛏️"
              title="No open IPD encounters"
              body="When patients are admitted, they will appear here grouped by ward."
            />
          ) : (
            <div className="space-y-6">
              {grouped.map(([ward, list]) => (
                <section key={ward} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{ward}</h2>
                    <span className="text-xs text-slate-500">{list.length} patient{list.length === 1 ? "" : "s"}</span>
                  </header>
                  <ul className="divide-y divide-slate-100">
                    {list.map((enc) => {
                      const color = vitalsStatus(enc.vitals);
                      return (
                        <li key={enc.id} className="p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">Patient {enc.patientId}</span>
                                <StatusBadge color={color} domain="patient" size="sm" />
                                {enc.type === "emergency" && (
                                  <StatusBadge color="red" domain="patient" label="ER" size="sm" />
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {enc.doctorName ? `Attending: ${enc.doctorName}` : "No attending doctor"}
                                {enc.diagnosis ? ` · Dx: ${enc.diagnosis}` : ""}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">{vitalsSummary(enc.vitals)}</p>
                              <p className="mt-0.5 text-[10.5px] text-slate-400">
                                Admitted {new Date(enc.startedAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                disabled={saving}
                                onClick={() => setCallOpen(callOpen === enc.id ? null : enc.id)}
                                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                              >
                                📞 Specialist call
                              </button>
                              {enc.department !== "ICU" && (
                                <button
                                  disabled={saving}
                                  onClick={() => transferToICU(enc)}
                                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                                >
                                  ↑ ICU
                                </button>
                              )}
                              <button
                                disabled={saving}
                                onClick={() => discharge(enc)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                              >
                                ✓ Discharge
                              </button>
                            </div>
                          </div>
                          {callOpen === enc.id && (
                            <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  type="text"
                                  placeholder="Specialty (e.g. Cardiology)"
                                  value={callForm.toSpecialty}
                                  onChange={(e) => setCallForm({ ...callForm, toSpecialty: e.target.value })}
                                  className="rounded-md border border-violet-200 bg-white px-3 py-1.5 text-xs"
                                />
                                <input
                                  type="text"
                                  placeholder="Reason for consult"
                                  value={callForm.reason}
                                  onChange={(e) => setCallForm({ ...callForm, reason: e.target.value })}
                                  className="rounded-md border border-violet-200 bg-white px-3 py-1.5 text-xs"
                                />
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => submitSpecialistCall(enc.id)}
                                  disabled={saving || !callForm.toSpecialty.trim()}
                                  className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Send call
                                </button>
                                <button
                                  onClick={() => { setCallOpen(null); setCallForm({ toSpecialty: "", reason: "" }); }}
                                  className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          {enc.notes && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">
                                Notes & coordination log
                              </summary>
                              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[11px] text-slate-700">
                                {enc.notes}
                              </pre>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
