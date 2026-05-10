"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";

type VehicleType = "basic" | "als" | "bls" | "neonatal" | "mortuary";
type VehicleStatus = "available" | "on_call" | "under_maintenance" | "out_of_service";
type VehicleOwnership = "owned" | "contracted" | "hired";
type CallType = "emergency" | "transfer" | "discharge" | "non_emergency";
type CallPriority = "code_red" | "code_yellow" | "code_green";
type CallStatus =
  | "requested" | "dispatched" | "en_route" | "on_scene"
  | "transporting" | "completed" | "cancelled";

interface Vehicle {
  id: string;
  vehicleCode: string;
  registrationNumber: string;
  make?: string;
  model?: string;
  year?: number;
  type: VehicleType;
  status: VehicleStatus;
  ownership: VehicleOwnership;
  baseLocation?: string;
  odometerKm?: number;
  lastServiceAt?: string;
  nextServiceDueAt?: string;
  insuranceExpiresAt?: string;
  puccExpiresAt?: string;
  fitnessExpiresAt?: string;
  equipment?: string;
  notes?: string;
  active: boolean;
}

interface Call {
  id: string;
  callNumber: string;
  callType: CallType;
  priority: CallPriority;
  callerName?: string;
  callerPhone?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: "male" | "female" | "other";
  chiefComplaint?: string;
  pickupAddress: string;
  destinationAddress?: string;
  destinationIsFacility?: boolean;
  vehicleId?: string;
  crewLead?: string;
  paramedic?: string;
  driver?: string;
  requestedAt: string;
  dispatchedAt?: string;
  arrivedAtPatientAt?: string;
  departedSceneAt?: string;
  arrivedAtDestinationAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  distanceKm?: number;
  billingAmount?: number;
  outcome?: string;
  cancelReason?: string;
  notes?: string;
  status: CallStatus;
}

const VEHICLE_TYPES: { v: VehicleType; l: string }[] = [
  { v: "basic", l: "Basic Transport" },
  { v: "als", l: "Advanced Life Support" },
  { v: "bls", l: "Basic Life Support" },
  { v: "neonatal", l: "Neonatal" },
  { v: "mortuary", l: "Mortuary" },
];

const VEHICLE_STATUSES: { v: VehicleStatus; l: string; cls: string }[] = [
  { v: "available", l: "Available", cls: "bg-emerald-100 text-emerald-700" },
  { v: "on_call", l: "On Call", cls: "bg-amber-100 text-amber-700" },
  { v: "under_maintenance", l: "Under Maintenance", cls: "bg-slate-100 text-slate-700" },
  { v: "out_of_service", l: "Out of Service", cls: "bg-red-100 text-red-700" },
];

const CALL_TYPES: { v: CallType; l: string }[] = [
  { v: "emergency", l: "Emergency (999/108)" },
  { v: "transfer", l: "Inter-facility Transfer" },
  { v: "discharge", l: "Discharge Transport" },
  { v: "non_emergency", l: "Non-emergency" },
];

const PRIORITIES: { v: CallPriority; l: string; cls: string }[] = [
  { v: "code_red", l: "Code Red (critical)", cls: "bg-red-100 text-red-700" },
  { v: "code_yellow", l: "Code Yellow (urgent)", cls: "bg-amber-100 text-amber-700" },
  { v: "code_green", l: "Code Green (stable)", cls: "bg-emerald-100 text-emerald-700" },
];

const CALL_STATUSES: { v: CallStatus; l: string; cls: string }[] = [
  { v: "requested", l: "Requested", cls: "bg-slate-100 text-slate-700" },
  { v: "dispatched", l: "Dispatched", cls: "bg-blue-100 text-blue-700" },
  { v: "en_route", l: "En Route", cls: "bg-indigo-100 text-indigo-700" },
  { v: "on_scene", l: "On Scene", cls: "bg-purple-100 text-purple-700" },
  { v: "transporting", l: "Transporting", cls: "bg-amber-100 text-amber-700" },
  { v: "completed", l: "Completed", cls: "bg-emerald-100 text-emerald-700" },
  { v: "cancelled", l: "Cancelled", cls: "bg-red-100 text-red-700" },
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
function daysUntil(s?: string): number | null {
  if (!s) return null;
  const d = new Date(s).getTime();
  if (Number.isNaN(d)) return null;
  return Math.round((d - Date.now()) / 86400000);
}
function statusPill(s: CallStatus): string {
  return CALL_STATUSES.find((x) => x.v === s)?.cls || "";
}
function priorityPill(p: CallPriority): string {
  return PRIORITIES.find((x) => x.v === p)?.cls || "";
}
function vehicleStatusPill(s: VehicleStatus): string {
  return VEHICLE_STATUSES.find((x) => x.v === s)?.cls || "";
}

export default function AmbulancePage() {
  const [tab, setTab] = useState<"calls" | "fleet">("calls");
  const [calls, setCalls] = useState<Call[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCallForm, setShowCallForm] = useState(false);
  const [editingCallId, setEditingCallId] = useState<string | null>(null);
  const [callForm, setCallForm] = useState<Record<string, string>>({});

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState<Record<string, string>>({});

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set("status", filterStatus);
      if (filterPriority) qs.set("priority", filterPriority);
      if (filterFrom) qs.set("from", filterFrom);
      if (filterTo) qs.set("to", filterTo);
      const [cRes, vRes] = await Promise.all([
        fetch(`/api/hospital/ambulance?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/hospital/ambulance/vehicles`, { cache: "no-store" }),
      ]);
      if (cRes.ok) {
        const d = await cRes.json();
        setCalls(d.calls || []);
      }
      if (vRes.ok) {
        const d = await vRes.json();
        setVehicles(d.vehicles || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterPriority, filterFrom, filterTo]);

  const vehicleMap = useMemo(() => {
    const m = new Map<string, Vehicle>();
    for (const v of vehicles) m.set(v.id, v);
    return m;
  }, [vehicles]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = calls.filter((c) =>
      c.status !== "completed" && c.status !== "cancelled"
    ).length;
    const todayCalls = calls.filter((c) =>
      c.requestedAt.slice(0, 10) === today
    ).length;
    const available = vehicles.filter((v) => v.status === "available" && v.active).length;
    const compliance = vehicles.filter((v) => {
      const d1 = daysUntil(v.insuranceExpiresAt);
      const d2 = daysUntil(v.puccExpiresAt);
      const d3 = daysUntil(v.fitnessExpiresAt);
      return [d1, d2, d3].some((x) => x !== null && x <= 30);
    }).length;
    return { active, todayCalls, available, compliance };
  }, [calls, vehicles]);

  function openCallForm(c?: Call) {
    if (c) {
      setEditingCallId(c.id);
      setCallForm({
        callType: c.callType,
        priority: c.priority,
        callerName: c.callerName || "",
        callerPhone: c.callerPhone || "",
        patientName: c.patientName || "",
        patientAge: c.patientAge !== undefined ? String(c.patientAge) : "",
        patientGender: c.patientGender || "",
        chiefComplaint: c.chiefComplaint || "",
        pickupAddress: c.pickupAddress,
        destinationAddress: c.destinationAddress || "",
        vehicleId: c.vehicleId || "",
        crewLead: c.crewLead || "",
        paramedic: c.paramedic || "",
        driver: c.driver || "",
        distanceKm: c.distanceKm !== undefined ? String(c.distanceKm) : "",
        billingAmount: c.billingAmount !== undefined ? String(c.billingAmount) : "",
        outcome: c.outcome || "",
        notes: c.notes || "",
        status: c.status,
      });
    } else {
      setEditingCallId(null);
      setCallForm({
        callType: "emergency",
        priority: "code_yellow",
        status: "requested",
      });
    }
    setShowCallForm(true);
  }

  async function saveCall() {
    if (!callForm.pickupAddress?.trim()) {
      alert("Pickup address is required");
      return;
    }
    const body: Record<string, unknown> = {
      callType: callForm.callType,
      priority: callForm.priority,
      callerName: callForm.callerName,
      callerPhone: callForm.callerPhone,
      patientName: callForm.patientName,
      patientAge: callForm.patientAge ? Number(callForm.patientAge) : undefined,
      patientGender: callForm.patientGender || undefined,
      chiefComplaint: callForm.chiefComplaint,
      pickupAddress: callForm.pickupAddress,
      destinationAddress: callForm.destinationAddress,
      vehicleId: callForm.vehicleId || undefined,
      crewLead: callForm.crewLead,
      paramedic: callForm.paramedic,
      driver: callForm.driver,
      distanceKm: callForm.distanceKm ? Number(callForm.distanceKm) : undefined,
      billingAmount: callForm.billingAmount ? Number(callForm.billingAmount) : undefined,
      outcome: callForm.outcome,
      notes: callForm.notes,
      status: callForm.status,
    };
    const res = await fetch("/api/hospital/ambulance", {
      method: editingCallId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingCallId ? { id: editingCallId, ...body } : body),
    });
    if (res.ok) {
      setShowCallForm(false);
      setEditingCallId(null);
      setCallForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function quickStatus(id: string, status: CallStatus) {
    await fetch("/api/hospital/ambulance", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function deleteCall(id: string) {
    if (!confirm("Delete this call record?")) return;
    await fetch("/api/hospital/ambulance", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function openVehicleForm(v?: Vehicle) {
    if (v) {
      setEditingVehicleId(v.id);
      setVehicleForm({
        registrationNumber: v.registrationNumber,
        make: v.make || "",
        model: v.model || "",
        year: v.year !== undefined ? String(v.year) : "",
        type: v.type,
        status: v.status,
        ownership: v.ownership,
        baseLocation: v.baseLocation || "",
        odometerKm: v.odometerKm !== undefined ? String(v.odometerKm) : "",
        lastServiceAt: v.lastServiceAt?.slice(0, 10) || "",
        nextServiceDueAt: v.nextServiceDueAt?.slice(0, 10) || "",
        insuranceExpiresAt: v.insuranceExpiresAt?.slice(0, 10) || "",
        puccExpiresAt: v.puccExpiresAt?.slice(0, 10) || "",
        fitnessExpiresAt: v.fitnessExpiresAt?.slice(0, 10) || "",
        equipment: v.equipment || "",
        notes: v.notes || "",
        active: v.active ? "1" : "0",
      });
    } else {
      setEditingVehicleId(null);
      setVehicleForm({
        type: "basic",
        status: "available",
        ownership: "owned",
        active: "1",
      });
    }
    setShowVehicleForm(true);
  }

  async function saveVehicle() {
    if (!vehicleForm.registrationNumber?.trim()) {
      alert("Registration number is required");
      return;
    }
    const body: Record<string, unknown> = {
      registrationNumber: vehicleForm.registrationNumber,
      make: vehicleForm.make,
      model: vehicleForm.model,
      year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
      type: vehicleForm.type,
      status: vehicleForm.status,
      ownership: vehicleForm.ownership,
      baseLocation: vehicleForm.baseLocation,
      odometerKm: vehicleForm.odometerKm ? Number(vehicleForm.odometerKm) : undefined,
      lastServiceAt: vehicleForm.lastServiceAt,
      nextServiceDueAt: vehicleForm.nextServiceDueAt,
      insuranceExpiresAt: vehicleForm.insuranceExpiresAt,
      puccExpiresAt: vehicleForm.puccExpiresAt,
      fitnessExpiresAt: vehicleForm.fitnessExpiresAt,
      equipment: vehicleForm.equipment,
      notes: vehicleForm.notes,
      active: vehicleForm.active === "1",
    };
    const res = await fetch("/api/hospital/ambulance/vehicles", {
      method: editingVehicleId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingVehicleId ? { id: editingVehicleId, ...body } : body),
    });
    if (res.ok) {
      setShowVehicleForm(false);
      setEditingVehicleId(null);
      setVehicleForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function deleteVehicle(id: string) {
    if (!confirm("Delete this vehicle? Linked calls will be detached.")) return;
    await fetch("/api/hospital/ambulance/vehicles", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🚑"
        eyebrow="Pre-Hospital"
        title="Ambulance & Dispatch"
        subtitle="Fleet management and emergency dispatch with real-time status tracking"
        tone="rose"
        primaryAction={
          tab === "fleet"
            ? { label: "+ Add Vehicle", onClick: () => openVehicleForm() }
            : { label: "+ New Call", onClick: () => openCallForm() }
        }
      />

      <StatGrid cols={4}>
        <StatCard label="Active calls" value={stats.active} tone={stats.active > 0 ? "amber" : "slate"} icon="🔴" />
        <StatCard label="Calls today" value={stats.todayCalls} tone="sky" icon="📞" />
        <StatCard label="Available vehicles" value={stats.available} tone="emerald" icon="🚐" />
        <StatCard label="Docs expiring ≤30d" value={stats.compliance} tone={stats.compliance > 0 ? "rose" : "indigo"} icon="📄" />
      </StatGrid>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["calls", "fleet"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-primary-600 text-primary-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "calls" ? "Dispatch Calls" : "Fleet"}
          </button>
        ))}
      </div>

      {tab === "calls" && (
        <Section>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Status">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="inp">
                <option value="">All</option>
                {CALL_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="inp">
                <option value="">All</option>
                {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>
            <Field label="From">
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="inp" />
            </Field>
            <Field label="To">
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="inp" />
            </Field>
            {(filterStatus || filterPriority || filterFrom || filterTo) && (
              <button
                onClick={() => {
                  setFilterStatus(""); setFilterPriority(""); setFilterFrom(""); setFilterTo("");
                }}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : calls.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No calls recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Call #</th>
                    <th className="py-2 pr-3">Requested</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Pickup</th>
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calls.map((c) => {
                    const v = c.vehicleId ? vehicleMap.get(c.vehicleId) : undefined;
                    const isOpen = expandedId === c.id;
                    return (
                      <Fragment key={c.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 pr-3 font-mono text-xs text-slate-600">{c.callNumber}</td>
                          <td className="py-2 pr-3 text-slate-700">{fmtDateTime(c.requestedAt)}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityPill(c.priority)}`}>
                              {PRIORITIES.find((x) => x.v === c.priority)?.l.split(" ")[1] || c.priority}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-slate-700">
                            {c.patientName || "—"}
                            {c.patientAge !== undefined && <span className="text-slate-400"> · {c.patientAge}y</span>}
                          </td>
                          <td className="py-2 pr-3 max-w-[200px] truncate text-slate-600" title={c.pickupAddress}>
                            {c.pickupAddress}
                          </td>
                          <td className="py-2 pr-3 text-slate-700">{v?.registrationNumber || "—"}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPill(c.status)}`}>
                              {CALL_STATUSES.find((x) => x.v === c.status)?.l}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <div className="flex justify-end gap-1">
                              {c.status === "requested" && (
                                <button onClick={() => quickStatus(c.id, "dispatched")} className="rounded bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-200">Dispatch</button>
                              )}
                              {c.status === "dispatched" && (
                                <button onClick={() => quickStatus(c.id, "en_route")} className="rounded bg-indigo-100 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-200">En Route</button>
                              )}
                              {c.status === "en_route" && (
                                <button onClick={() => quickStatus(c.id, "on_scene")} className="rounded bg-purple-100 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-200">On Scene</button>
                              )}
                              {c.status === "on_scene" && (
                                <button onClick={() => quickStatus(c.id, "transporting")} className="rounded bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-200">Transport</button>
                              )}
                              {c.status === "transporting" && (
                                <button onClick={() => quickStatus(c.id, "completed")} className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-200">Complete</button>
                              )}
                              <button onClick={() => setExpandedId(isOpen ? null : c.id)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">{isOpen ? "Hide" : "Details"}</button>
                              <button onClick={() => openCallForm(c)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">Edit</button>
                              <button onClick={() => deleteCall(c.id)} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100">Delete</button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50 px-3 py-3">
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-3">
                                <KV label="Caller" value={c.callerName || "—"} />
                                <KV label="Caller phone" value={c.callerPhone || "—"} />
                                <KV label="Call type" value={CALL_TYPES.find((x) => x.v === c.callType)?.l || c.callType} />
                                <KV label="Chief complaint" value={c.chiefComplaint || "—"} />
                                <KV label="Destination" value={c.destinationAddress || "—"} />
                                <KV label="Distance" value={c.distanceKm !== undefined ? `${c.distanceKm} km` : "—"} />
                                <KV label="Crew lead" value={c.crewLead || "—"} />
                                <KV label="Paramedic" value={c.paramedic || "—"} />
                                <KV label="Driver" value={c.driver || "—"} />
                                <KV label="Dispatched" value={fmtDateTime(c.dispatchedAt)} />
                                <KV label="On scene" value={fmtDateTime(c.arrivedAtPatientAt)} />
                                <KV label="Departed scene" value={fmtDateTime(c.departedSceneAt)} />
                                <KV label="At destination" value={fmtDateTime(c.arrivedAtDestinationAt)} />
                                <KV label="Completed" value={fmtDateTime(c.completedAt)} />
                                <KV label="Billing" value={c.billingAmount !== undefined ? `₹${c.billingAmount}` : "—"} />
                                <KV label="Outcome" value={c.outcome || "—"} />
                                {c.cancelReason && <KV label="Cancel reason" value={c.cancelReason} />}
                                {c.notes && <KV label="Notes" value={c.notes} />}
                              </div>
                              {c.status !== "completed" && c.status !== "cancelled" && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => {
                                      const reason = prompt("Cancel reason?");
                                      if (reason !== null) {
                                        fetch("/api/hospital/ambulance", {
                                          method: "PATCH",
                                          headers: { "content-type": "application/json" },
                                          body: JSON.stringify({ id: c.id, status: "cancelled", cancelReason: reason }),
                                        }).then(load);
                                      }
                                    }}
                                    className="rounded bg-red-50 px-3 py-1 text-[12px] font-medium text-red-600 hover:bg-red-100"
                                  >
                                    Cancel call
                                  </button>
                                </div>
                              )}
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

      {tab === "fleet" && (
        <Section>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : vehicles.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No vehicles yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Registration</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Base</th>
                    <th className="py-2 pr-3">Odometer</th>
                    <th className="py-2 pr-3">Compliance</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => {
                    const dIns = daysUntil(v.insuranceExpiresAt);
                    const dPuc = daysUntil(v.puccExpiresAt);
                    const dFit = daysUntil(v.fitnessExpiresAt);
                    const worst = [dIns, dPuc, dFit]
                      .filter((x): x is number => x !== null)
                      .sort((a, b) => a - b)[0];
                    const worstCls =
                      worst === undefined
                        ? "text-slate-400"
                        : worst < 0
                          ? "text-red-700 font-semibold"
                          : worst <= 30
                            ? "text-amber-700 font-semibold"
                            : "text-slate-600";
                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-3 font-mono text-xs text-slate-600">{v.vehicleCode}</td>
                        <td className="py-2 pr-3 font-medium text-slate-800">{v.registrationNumber}</td>
                        <td className="py-2 pr-3 text-slate-700">{VEHICLE_TYPES.find((x) => x.v === v.type)?.l}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${vehicleStatusPill(v.status)}`}>
                            {VEHICLE_STATUSES.find((x) => x.v === v.status)?.l}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{v.baseLocation || "—"}</td>
                        <td className="py-2 pr-3 text-slate-600">{v.odometerKm !== undefined ? `${v.odometerKm.toLocaleString()} km` : "—"}</td>
                        <td className={`py-2 pr-3 text-[12px] ${worstCls}`}>
                          {worst === undefined
                            ? "—"
                            : worst < 0
                              ? `Expired ${-worst}d ago`
                              : `${worst}d`}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openVehicleForm(v)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">Edit</button>
                            <button onClick={() => deleteVehicle(v.id)} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100">Delete</button>
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

      {/* Call form */}
      {showCallForm && (
        <Modal onClose={() => setShowCallForm(false)} title={editingCallId ? "Edit Call" : "New Dispatch Call"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Call type">
              <select value={callForm.callType || "emergency"} onChange={(e) => setCallForm({ ...callForm, callType: e.target.value })} className="inp">
                {CALL_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={callForm.priority || "code_yellow"} onChange={(e) => setCallForm({ ...callForm, priority: e.target.value })} className="inp">
                {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>
            <Field label="Caller name">
              <input value={callForm.callerName || ""} onChange={(e) => setCallForm({ ...callForm, callerName: e.target.value })} className="inp" />
            </Field>
            <Field label="Caller phone">
              <input value={callForm.callerPhone || ""} onChange={(e) => setCallForm({ ...callForm, callerPhone: e.target.value })} className="inp" />
            </Field>
            <Field label="Patient name">
              <input value={callForm.patientName || ""} onChange={(e) => setCallForm({ ...callForm, patientName: e.target.value })} className="inp" />
            </Field>
            <Field label="Age">
              <input type="number" value={callForm.patientAge || ""} onChange={(e) => setCallForm({ ...callForm, patientAge: e.target.value })} className="inp" />
            </Field>
            <Field label="Gender">
              <select value={callForm.patientGender || ""} onChange={(e) => setCallForm({ ...callForm, patientGender: e.target.value })} className="inp">
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Chief complaint">
              <input value={callForm.chiefComplaint || ""} onChange={(e) => setCallForm({ ...callForm, chiefComplaint: e.target.value })} className="inp" />
            </Field>
            <Field label="Pickup address *" span={2}>
              <input value={callForm.pickupAddress || ""} onChange={(e) => setCallForm({ ...callForm, pickupAddress: e.target.value })} className="inp" />
            </Field>
            <Field label="Destination" span={2}>
              <input value={callForm.destinationAddress || ""} onChange={(e) => setCallForm({ ...callForm, destinationAddress: e.target.value })} className="inp" />
            </Field>
            <Field label="Vehicle">
              <select value={callForm.vehicleId || ""} onChange={(e) => setCallForm({ ...callForm, vehicleId: e.target.value })} className="inp">
                <option value="">— Unassigned —</option>
                {vehicles.filter((v) => v.active).map((v) => (
                  <option key={v.id} value={v.id}>{v.registrationNumber} ({VEHICLE_TYPES.find((t) => t.v === v.type)?.l})</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={callForm.status || "requested"} onChange={(e) => setCallForm({ ...callForm, status: e.target.value })} className="inp">
                {CALL_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="Crew lead">
              <input value={callForm.crewLead || ""} onChange={(e) => setCallForm({ ...callForm, crewLead: e.target.value })} className="inp" />
            </Field>
            <Field label="Paramedic">
              <input value={callForm.paramedic || ""} onChange={(e) => setCallForm({ ...callForm, paramedic: e.target.value })} className="inp" />
            </Field>
            <Field label="Driver">
              <input value={callForm.driver || ""} onChange={(e) => setCallForm({ ...callForm, driver: e.target.value })} className="inp" />
            </Field>
            <Field label="Distance (km)">
              <input type="number" value={callForm.distanceKm || ""} onChange={(e) => setCallForm({ ...callForm, distanceKm: e.target.value })} className="inp" />
            </Field>
            <Field label="Billing (₹)">
              <input type="number" value={callForm.billingAmount || ""} onChange={(e) => setCallForm({ ...callForm, billingAmount: e.target.value })} className="inp" />
            </Field>
            <Field label="Outcome">
              <input value={callForm.outcome || ""} onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })} className="inp" placeholder="e.g. Admitted to ER" />
            </Field>
            <Field label="Notes" span={2}>
              <textarea value={callForm.notes || ""} onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })} className="inp" rows={2} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCallForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveCall} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {editingCallId ? "Save" : "Create call"}
            </button>
          </div>
        </Modal>
      )}

      {/* Vehicle form */}
      {showVehicleForm && (
        <Modal onClose={() => setShowVehicleForm(false)} title={editingVehicleId ? "Edit Vehicle" : "Add Vehicle"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration # *">
              <input value={vehicleForm.registrationNumber || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })} className="inp" placeholder="MH-01-AB-1234" />
            </Field>
            <Field label="Type">
              <select value={vehicleForm.type || "basic"} onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })} className="inp">
                {VEHICLE_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Make">
              <input value={vehicleForm.make || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} className="inp" />
            </Field>
            <Field label="Model">
              <input value={vehicleForm.model || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} className="inp" />
            </Field>
            <Field label="Year">
              <input type="number" value={vehicleForm.year || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} className="inp" />
            </Field>
            <Field label="Status">
              <select value={vehicleForm.status || "available"} onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })} className="inp">
                {VEHICLE_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="Ownership">
              <select value={vehicleForm.ownership || "owned"} onChange={(e) => setVehicleForm({ ...vehicleForm, ownership: e.target.value })} className="inp">
                <option value="owned">Owned</option>
                <option value="contracted">Contracted</option>
                <option value="hired">Hired</option>
              </select>
            </Field>
            <Field label="Base location">
              <input value={vehicleForm.baseLocation || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, baseLocation: e.target.value })} className="inp" />
            </Field>
            <Field label="Odometer (km)">
              <input type="number" value={vehicleForm.odometerKm || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, odometerKm: e.target.value })} className="inp" />
            </Field>
            <Field label="Last service">
              <input type="date" value={vehicleForm.lastServiceAt || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, lastServiceAt: e.target.value })} className="inp" />
            </Field>
            <Field label="Next service due">
              <input type="date" value={vehicleForm.nextServiceDueAt || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, nextServiceDueAt: e.target.value })} className="inp" />
            </Field>
            <Field label="Insurance expires">
              <input type="date" value={vehicleForm.insuranceExpiresAt || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiresAt: e.target.value })} className="inp" />
            </Field>
            <Field label="PUCC expires">
              <input type="date" value={vehicleForm.puccExpiresAt || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, puccExpiresAt: e.target.value })} className="inp" />
            </Field>
            <Field label="Fitness expires">
              <input type="date" value={vehicleForm.fitnessExpiresAt || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, fitnessExpiresAt: e.target.value })} className="inp" />
            </Field>
            <Field label="Active">
              <select value={vehicleForm.active || "1"} onChange={(e) => setVehicleForm({ ...vehicleForm, active: e.target.value })} className="inp">
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </Field>
            <Field label="Equipment" span={2}>
              <textarea value={vehicleForm.equipment || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, equipment: e.target.value })} className="inp" rows={2} placeholder="Defibrillator, O2 cylinder, ventilator, ..." />
            </Field>
            <Field label="Notes" span={2}>
              <textarea value={vehicleForm.notes || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })} className="inp" rows={2} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowVehicleForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveVehicle} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {editingVehicleId ? "Save" : "Add vehicle"}
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
