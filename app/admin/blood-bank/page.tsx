"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard as ShellStatCard } from "@/components/admin/PageShell";

export const dynamic = "force-dynamic";

type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
type BloodComponent =
  | "whole_blood"
  | "prbc"
  | "platelets"
  | "plasma"
  | "cryoprecipitate";
type UnitStatus =
  | "quarantined"
  | "available"
  | "reserved"
  | "issued"
  | "transfused"
  | "discarded"
  | "expired";
type DonorEligibility = "eligible" | "deferred" | "permanent_deferral";
type RequestStatus =
  | "requested"
  | "crossmatching"
  | "ready"
  | "issued"
  | "transfused"
  | "cancelled";
type RequestPriority = "routine" | "urgent" | "stat";

interface Donor {
  id: string;
  donorCode: string;
  firstName: string;
  lastName: string;
  bloodGroup: BloodGroup;
  phone?: string;
  lastDonationDate?: string;
  totalDonations: number;
  eligibility: DonorEligibility;
  deferralReason?: string;
}

interface BloodUnit {
  id: string;
  unitNumber: string;
  donorId?: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  volumeMl: number;
  collectedAt: string;
  expiresAt: string;
  status: UnitStatus;
  screeningComplete: boolean;
  reservedForPatientId?: string;
  reservedForRequestId?: string;
}

interface TransfusionRequest {
  id: string;
  requestNumber: string;
  patientId: string;
  patientBloodGroup: BloodGroup;
  component: BloodComponent;
  unitsRequested: number;
  priority: RequestPriority;
  indication?: string;
  reservedUnitIds: string[];
  issuedUnitIds: string[];
  transfusedUnitIds: string[];
  status: RequestStatus;
  orderedAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS: { value: BloodComponent; label: string }[] = [
  { value: "whole_blood", label: "Whole Blood" },
  { value: "prbc", label: "PRBC" },
  { value: "platelets", label: "Platelets" },
  { value: "plasma", label: "Plasma" },
  { value: "cryoprecipitate", label: "Cryoprecipitate" },
];

const UNIT_STATUS_COLOR: Record<UnitStatus, string> = {
  quarantined: "bg-amber-100 text-amber-700 border-amber-200",
  available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  reserved: "bg-blue-100 text-blue-700 border-blue-200",
  issued: "bg-violet-100 text-violet-700 border-violet-200",
  transfused: "bg-slate-200 text-slate-700 border-slate-300",
  discarded: "bg-rose-100 text-rose-700 border-rose-200",
  expired: "bg-red-100 text-red-700 border-red-200",
};

const REQ_STATUS_COLOR: Record<RequestStatus, string> = {
  requested: "bg-slate-100 text-slate-700 border-slate-200",
  crossmatching: "bg-amber-100 text-amber-700 border-amber-200",
  ready: "bg-blue-100 text-blue-700 border-blue-200",
  issued: "bg-violet-100 text-violet-700 border-violet-200",
  transfused: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const PRIORITY_COLOR: Record<RequestPriority, string> = {
  routine: "bg-slate-50 text-slate-600 border-slate-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  stat: "bg-red-50 text-red-700 border-red-200",
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
}

export default function BloodBankPage() {
  const [tab, setTab] = useState<"inventory" | "donors" | "requests">(
    "inventory"
  );
  const [donors, setDonors] = useState<Donor[]>([]);
  const [unitsList, setUnitsList] = useState<BloodUnit[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<TransfusionRequest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [dRes, uRes, rRes, pRes] = await Promise.all([
        fetch("/api/hospital/blood-donors"),
        fetch("/api/hospital/blood-units"),
        fetch("/api/hospital/transfusion-requests"),
        fetch("/api/patients"),
      ]);
      const d = await dRes.json();
      const u = await uRes.json();
      const r = await rRes.json();
      const p = await pRes.json();
      setDonors(d.donors || []);
      setUnitsList(u.units || []);
      setInventory(u.inventory || {});
      setRequests(r.requests || []);
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

  const donorLabel = (id?: string) => {
    if (!id) return "—";
    const d = donors.find((x) => x.id === id);
    return d ? `${d.firstName} ${d.lastName} (${d.donorCode})` : id;
  };

  // ── Aggregate inventory table by group × component, status=available
  const availGrid = useMemo(() => {
    const g: Record<string, number> = {};
    for (const key of Object.keys(inventory)) {
      const [group, component, status] = key.split("|");
      if (status !== "available") continue;
      const k = `${group}|${component}`;
      g[k] = (g[k] || 0) + inventory[key];
    }
    return g;
  }, [inventory]);

  const topStats = useMemo(() => {
    const total = unitsList.length;
    const available = unitsList.filter((u) => u.status === "available").length;
    const reserved = unitsList.filter((u) => u.status === "reserved").length;
    const expiringSoon = unitsList.filter(
      (u) => u.status === "available" && daysUntil(u.expiresAt) <= 3
    ).length;
    const openRequests = requests.filter(
      (r) =>
        r.status === "requested" ||
        r.status === "crossmatching" ||
        r.status === "ready"
    ).length;
    return { total, available, reserved, expiringSoon, openRequests };
  }, [unitsList, requests]);

  return (
    <div className="space-y-6">
      <PageHero
        icon="🩸"
        eyebrow="Transfusion Services"
        title="Blood Bank"
        subtitle="Donors, blood-unit inventory, and transfusion requests with ABO/Rh compatibility and FEFO reservation"
        tone="rose"
      />

      <StatGrid cols={5}>
        <ShellStatCard label="Total units" value={topStats.total} tone="indigo" icon="📦" />
        <ShellStatCard label="Available" value={topStats.available} tone="emerald" icon="✓" />
        <ShellStatCard label="Reserved" value={topStats.reserved} tone="sky" icon="🔖" />
        <ShellStatCard label="Expiring ≤3d" value={topStats.expiringSoon} tone={topStats.expiringSoon > 0 ? "rose" : "slate"} icon="⏰" />
        <ShellStatCard label="Open requests" value={topStats.openRequests} tone="violet" icon="📋" />
      </StatGrid>

      {/* tabs */}
      <div className="flex border-b border-slate-200">
        {[
          ["inventory", "Inventory & Units"],
          ["donors", "Donors"],
          ["requests", "Transfusion Requests"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === k
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
      ) : tab === "inventory" ? (
        <InventoryTab
          units={unitsList}
          availGrid={availGrid}
          donors={donors}
          donorLabel={donorLabel}
          reload={loadAll}
        />
      ) : tab === "donors" ? (
        <DonorsTab donors={donors} reload={loadAll} />
      ) : (
        <RequestsTab
          requests={requests}
          patients={patients}
          patientLabel={patientLabel}
          reload={loadAll}
        />
      )}

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

// ─────────────────────────── Inventory tab ──────────────────────────────────

function InventoryTab({
  units,
  availGrid,
  donors,
  donorLabel,
  reload,
}: {
  units: BloodUnit[];
  availGrid: Record<string, number>;
  donors: Donor[];
  donorLabel: (id?: string) => string;
  reload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    donorId: "",
    bloodGroup: "O+" as BloodGroup,
    component: "prbc" as BloodComponent,
    volumeMl: "",
    screeningComplete: true,
    notes: "",
  });
  const [groupFilter, setGroupFilter] = useState<"all" | BloodGroup>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UnitStatus>("all");

  const filtered = units.filter((u) => {
    if (groupFilter !== "all" && u.bloodGroup !== groupFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    return true;
  });

  async function submit() {
    const res = await fetch("/api/hospital/blood-units", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        donorId: form.donorId || undefined,
        bloodGroup: form.bloodGroup,
        component: form.component,
        volumeMl: form.volumeMl ? Number(form.volumeMl) : undefined,
        screeningComplete: form.screeningComplete,
        notes: form.notes || undefined,
      }),
    });
    if (res.ok) {
      setForm({
        donorId: "",
        bloodGroup: "O+",
        component: "prbc",
        volumeMl: "",
        screeningComplete: true,
        notes: "",
      });
      setShowForm(false);
      reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed");
    }
  }

  async function setStatus(id: string, status: UnitStatus) {
    await fetch("/api/hospital/blood-units", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    reload();
  }

  async function del(id: string) {
    if (!confirm("Delete this unit?")) return;
    await fetch("/api/hospital/blood-units", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    reload();
  }

  return (
    <div className="space-y-4">
      {/* availability grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          Available units by group × component
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="px-2 py-1 text-left">Group</th>
                {COMPONENTS.map((c) => (
                  <th key={c.value} className="px-2 py-1 text-right">
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => {
                const rowTotal = COMPONENTS.reduce(
                  (s, c) => s + (availGrid[`${g}|${c.value}`] || 0),
                  0
                );
                return (
                  <tr
                    key={g}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-1.5 font-mono font-semibold text-slate-900">
                      {g}
                    </td>
                    {COMPONENTS.map((c) => {
                      const v = availGrid[`${g}|${c.value}`] || 0;
                      return (
                        <td
                          key={c.value}
                          className={`px-2 py-1.5 text-right ${v > 0 ? "font-semibold text-emerald-700" : "text-slate-300"}`}
                        >
                          {v}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-900">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* add unit */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? "Close" : "+ Register Blood Unit"}
        </button>
        <select
          className="input max-w-[140px]"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value as any)}
        >
          <option value="all">All groups</option>
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="quarantined">Quarantined</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="issued">Issued</option>
          <option value="transfused">Transfused</option>
          <option value="expired">Expired</option>
          <option value="discarded">Discarded</option>
        </select>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Donor (optional)">
              <select
                className="input"
                value={form.donorId}
                onChange={(e) => setForm({ ...form, donorId: e.target.value })}
              >
                <option value="">— external / unspecified —</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} ({d.bloodGroup})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Blood group *">
              <select
                className="input"
                value={form.bloodGroup}
                onChange={(e) =>
                  setForm({ ...form, bloodGroup: e.target.value as BloodGroup })
                }
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Component *">
              <select
                className="input"
                value={form.component}
                onChange={(e) =>
                  setForm({
                    ...form,
                    component: e.target.value as BloodComponent,
                  })
                }
              >
                {COMPONENTS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Volume (ml)">
              <input
                type="number"
                className="input"
                value={form.volumeMl}
                onChange={(e) =>
                  setForm({ ...form, volumeMl: e.target.value })
                }
                placeholder="250"
              />
            </Field>
            <Field label="Screening complete">
              <select
                className="input"
                value={form.screeningComplete ? "yes" : "no"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    screeningComplete: e.target.value === "yes",
                  })
                }
              >
                <option value="yes">Yes (→ available)</option>
                <option value="no">No (→ quarantined)</option>
              </select>
            </Field>
            <Field label="Notes">
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <button
            onClick={submit}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Register unit
          </button>
        </div>
      )}

      {/* units list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No units match.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-3 py-2 text-left">Unit #</th>
                <th className="px-3 py-2 text-left">Group</th>
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-right">Vol (ml)</th>
                <th className="px-3 py-2 text-left">Donor</th>
                <th className="px-3 py-2 text-left">Expires</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const d = daysUntil(u.expiresAt);
                return (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                      {u.unitNumber}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {u.bloodGroup}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {COMPONENTS.find((c) => c.value === u.component)?.label}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-slate-600">
                      {u.volumeMl}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {donorLabel(u.donorId)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs ${d < 0 ? "text-red-600" : d <= 3 ? "text-amber-600" : "text-slate-600"}`}
                    >
                      {u.expiresAt.slice(0, 10)}
                      <span className="ml-1 text-slate-400">
                        ({d < 0 ? `${-d}d ago` : `${d}d`})
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${UNIT_STATUS_COLOR[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <select
                        className="input max-w-[140px] text-xs"
                        value={u.status}
                        onChange={(e) =>
                          setStatus(u.id, e.target.value as UnitStatus)
                        }
                      >
                        <option value="quarantined">quarantined</option>
                        <option value="available">available</option>
                        <option value="reserved">reserved</option>
                        <option value="issued">issued</option>
                        <option value="transfused">transfused</option>
                        <option value="discarded">discarded</option>
                        <option value="expired">expired</option>
                      </select>
                      <button
                        onClick={() => del(u.id)}
                        className="ml-2 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────── Donors tab ────────────────────────────────────

function DonorsTab({
  donors,
  reload,
}: {
  donors: Donor[];
  reload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    bloodGroup: "O+" as BloodGroup,
    phone: "",
    eligibility: "eligible" as DonorEligibility,
    deferralReason: "",
    notes: "",
  });
  const [search, setSearch] = useState("");

  const filtered = donors.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.firstName.toLowerCase().includes(q) ||
      d.lastName.toLowerCase().includes(q) ||
      d.donorCode.toLowerCase().includes(q) ||
      (d.phone || "").includes(q)
    );
  });

  async function submit() {
    const payload: any = {
      firstName: form.firstName,
      lastName: form.lastName,
      bloodGroup: form.bloodGroup,
      phone: form.phone || undefined,
      eligibility: form.eligibility,
      deferralReason: form.deferralReason || undefined,
      notes: form.notes || undefined,
    };
    if (editingId) payload.id = editingId;
    const res = await fetch("/api/hospital/blood-donors", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setForm({
        firstName: "",
        lastName: "",
        bloodGroup: "O+",
        phone: "",
        eligibility: "eligible",
        deferralReason: "",
        notes: "",
      });
      setEditingId(null);
      setShowForm(false);
      reload();
    }
  }

  function startEdit(d: Donor) {
    setEditingId(d.id);
    setShowForm(true);
    setForm({
      firstName: d.firstName,
      lastName: d.lastName,
      bloodGroup: d.bloodGroup,
      phone: d.phone || "",
      eligibility: d.eligibility,
      deferralReason: d.deferralReason || "",
      notes: "",
    });
  }

  async function del(id: string) {
    if (!confirm("Delete donor?")) return;
    await fetch("/api/hospital/blood-donors", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setEditingId(null);
            setForm({
              firstName: "",
              lastName: "",
              bloodGroup: "O+",
              phone: "",
              eligibility: "eligible",
              deferralReason: "",
              notes: "",
            });
            setShowForm(!showForm);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? "Close" : "+ Register Donor"}
        </button>
        <input
          className="input max-w-xs"
          placeholder="Search donors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="First name *">
              <input
                className="input"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </Field>
            <Field label="Last name *">
              <input
                className="input"
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
              />
            </Field>
            <Field label="Blood group *">
              <select
                className="input"
                value={form.bloodGroup}
                onChange={(e) =>
                  setForm({ ...form, bloodGroup: e.target.value as BloodGroup })
                }
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Eligibility">
              <select
                className="input"
                value={form.eligibility}
                onChange={(e) =>
                  setForm({
                    ...form,
                    eligibility: e.target.value as DonorEligibility,
                  })
                }
              >
                <option value="eligible">Eligible</option>
                <option value="deferred">Temporarily deferred</option>
                <option value="permanent_deferral">Permanent deferral</option>
              </select>
            </Field>
            <Field label="Deferral reason">
              <input
                className="input"
                value={form.deferralReason}
                onChange={(e) =>
                  setForm({ ...form, deferralReason: e.target.value })
                }
              />
            </Field>
          </div>
          <button
            onClick={submit}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {editingId ? "Save changes" : "Register donor"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No donors registered yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Group</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-right">Donations</th>
                <th className="px-3 py-2 text-left">Last donated</th>
                <th className="px-3 py-2 text-left">Eligibility</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">
                    {d.donorCode}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {d.firstName} {d.lastName}
                  </td>
                  <td className="px-3 py-2 font-semibold text-red-700">
                    {d.bloodGroup}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {d.phone || "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-slate-600">
                    {d.totalDonations}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {d.lastDonationDate || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        d.eligibility === "eligible"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : d.eligibility === "deferred"
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-rose-100 text-rose-700 border-rose-200"
                      }`}
                    >
                      {d.eligibility}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => startEdit(d)}
                      className="mr-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => del(d.id)}
                      className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Requests tab ───────────────────────────────────

function RequestsTab({
  requests,
  patients,
  patientLabel,
  reload,
}: {
  requests: TransfusionRequest[];
  patients: Patient[];
  patientLabel: (id: string) => string;
  reload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    patientBloodGroup: "O+" as BloodGroup,
    component: "prbc" as BloodComponent,
    unitsRequested: "2",
    priority: "routine" as RequestPriority,
    indication: "",
    orderedBy: "",
  });

  async function submit() {
    const res = await fetch("/api/hospital/transfusion-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId: form.patientId,
        patientBloodGroup: form.patientBloodGroup,
        component: form.component,
        unitsRequested: Number(form.unitsRequested),
        priority: form.priority,
        indication: form.indication || undefined,
        orderedBy: form.orderedBy || undefined,
      }),
    });
    if (res.ok) {
      setForm({
        patientId: "",
        patientBloodGroup: "O+",
        component: "prbc",
        unitsRequested: "2",
        priority: "routine",
        indication: "",
        orderedBy: "",
      });
      setShowForm(false);
      reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed");
    }
  }

  async function action(
    id: string,
    act: "reserve" | "issue" | "transfuse" | "cancel"
  ) {
    const res = await fetch("/api/hospital/transfusion-requests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action: act }),
    });
    if (res.ok) {
      const j = await res.json();
      if (act === "reserve" && j.newlyReserved) {
        if (j.newlyReserved.length === 0)
          alert("No compatible units currently available.");
      }
      reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete request and release reservations?")) return;
    await fetch("/api/hospital/transfusion-requests", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    reload();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {showForm ? "Close" : "+ New Transfusion Request"}
      </button>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient *">
              <select
                className="input"
                value={form.patientId}
                onChange={(e) => {
                  setForm({ ...form, patientId: e.target.value });
                }}
              >
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Patient blood group *">
              <select
                className="input"
                value={form.patientBloodGroup}
                onChange={(e) =>
                  setForm({
                    ...form,
                    patientBloodGroup: e.target.value as BloodGroup,
                  })
                }
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Component *">
              <select
                className="input"
                value={form.component}
                onChange={(e) =>
                  setForm({
                    ...form,
                    component: e.target.value as BloodComponent,
                  })
                }
              >
                {COMPONENTS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Units *">
              <input
                type="number"
                min={1}
                className="input"
                value={form.unitsRequested}
                onChange={(e) =>
                  setForm({ ...form, unitsRequested: e.target.value })
                }
              />
            </Field>
            <Field label="Priority">
              <select
                className="input"
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as RequestPriority,
                  })
                }
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </Field>
            <Field label="Ordered by">
              <input
                className="input"
                value={form.orderedBy}
                onChange={(e) =>
                  setForm({ ...form, orderedBy: e.target.value })
                }
              />
            </Field>
            <Field label="Indication" className="md:col-span-3">
              <input
                className="input"
                value={form.indication}
                onChange={(e) =>
                  setForm({ ...form, indication: e.target.value })
                }
                placeholder="Pre-op anemia, post-partum hemorrhage..."
              />
            </Field>
          </div>
          <button
            onClick={submit}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create request
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {requests.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No transfusion requests yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">
                        {r.requestNumber}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {patientLabel(r.patientId)}
                      </span>
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        {r.patientBloodGroup}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                        {COMPONENTS.find((c) => c.value === r.component)?.label}
                        {" × "}
                        {r.unitsRequested}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[r.priority]}`}
                      >
                        {r.priority}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${REQ_STATUS_COLOR[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {r.indication ? `${r.indication} · ` : ""}
                      Reserved: {r.reservedUnitIds.length}/{r.unitsRequested} ·
                      Issued: {r.issuedUnitIds.length} · Transfused:{" "}
                      {r.transfusedUnitIds.length}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(r.status === "requested" ||
                      r.status === "crossmatching") && (
                      <button
                        onClick={() => action(r.id, "reserve")}
                        className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Reserve units
                      </button>
                    )}
                    {r.status === "ready" && (
                      <button
                        onClick={() => action(r.id, "issue")}
                        className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                      >
                        Issue
                      </button>
                    )}
                    {(r.status === "issued" || r.status === "ready") && (
                      <button
                        onClick={() => action(r.id, "transfuse")}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Mark transfused
                      </button>
                    )}
                    {r.status !== "transfused" &&
                      r.status !== "cancelled" && (
                        <button
                          onClick={() => action(r.id, "cancel")}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      )}
                    <button
                      onClick={() => del(r.id)}
                      className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────── widgets ───────────────────────────────────────

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
  accent?: "emerald" | "blue" | "red" | "violet";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "blue"
      ? "text-blue-700"
      : accent === "red"
      ? "text-red-700"
      : accent === "violet"
      ? "text-violet-700"
      : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
