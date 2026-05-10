"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  VisitorPass,
  VisitorBlacklist,
  VisitPurpose,
  PassStatus,
  IdProofType,
  VisitorStats,
} from "@/lib/hospital/visitors-store";
// Inlined from visitors-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const PURPOSE_LABEL: Record<VisitPurpose, string> = {
  patient_visit: "Patient visit",
  vendor: "Vendor",
  contractor: "Contractor",
  interview: "Interview",
  official: "Official",
  delivery: "Delivery",
  other: "Other",
};
const ID_LABEL: Record<IdProofType, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  passport: "Passport",
  driving_license: "Driving License",
  voter_id: "Voter ID",
  employee_id: "Employee ID",
  other: "Other",
};

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const PURPOSES: VisitPurpose[] = [
  "patient_visit",
  "vendor",
  "contractor",
  "interview",
  "official",
  "delivery",
  "other",
];

const STATUSES: PassStatus[] = ["checked_in", "checked_out", "expired"];

const ID_TYPES: IdProofType[] = [
  "aadhaar",
  "pan",
  "passport",
  "driving_license",
  "voter_id",
  "employee_id",
  "other",
];

const PURPOSE_COLOR: Record<VisitPurpose, string> = {
  patient_visit: "bg-emerald-100 text-emerald-700",
  vendor: "bg-sky-100 text-sky-700",
  contractor: "bg-amber-100 text-amber-800",
  interview: "bg-purple-100 text-purple-700",
  official: "bg-indigo-100 text-indigo-700",
  delivery: "bg-slate-100 text-slate-700",
  other: "bg-slate-100 text-slate-600",
};

const STATUS_COLOR: Record<PassStatus, string> = {
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-slate-100 text-slate-700",
  expired: "bg-rose-100 text-rose-700",
};

export default function VisitorsPage() {
  const [tab, setTab] = useState<"live" | "history" | "blacklist">("live");
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [blacklist, setBlacklist] = useState<VisitorBlacklist[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<PassStatus | "">("");
  const [filterPurpose, setFilterPurpose] = useState<VisitPurpose | "">("");
  const [overstayOnly, setOverstayOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showBlacklistForm, setShowBlacklistForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (tab === "live") p.set("insideOnly", "1");
    if (filterStatus) p.set("status", filterStatus);
    if (filterPurpose) p.set("purpose", filterPurpose);
    if (overstayOnly) p.set("overstayOnly", "1");
    const [passRes, blRes, patRes] = await Promise.all([
      fetch(`/api/hospital/visitors?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/hospital/visitors/blacklist", { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (passRes.ok) {
      const d = await passRes.json();
      setPasses(d.passes || []);
      setStats(d.stats || null);
    }
    if (blRes.ok) {
      const d = await blRes.json();
      setBlacklist(d.blacklist || []);
    }
    if (patRes.ok) {
      const d = await patRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tab, filterStatus, filterPurpose, overstayOnly]);

  // Refresh live tab every 30s for currently-inside counts
  useEffect(() => {
    if (tab !== "live") return;
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function checkOut(id: string) {
    await fetch("/api/hospital/visitors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "checkout", id }),
    });
    load();
  }

  async function deletePass(id: string) {
    if (!confirm("Delete this pass record?")) return;
    await fetch("/api/hospital/visitors", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function toggleBlacklist(id: string, active: boolean) {
    await fetch("/api/hospital/visitors/blacklist", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    load();
  }

  async function deleteBL(id: string) {
    if (!confirm("Remove from blacklist permanently?")) return;
    await fetch("/api/hospital/visitors/blacklist", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🛂"
        eyebrow="Front Office"
        title="Visitor Management"
        subtitle="Badge issuance, overstay detection, and blacklist enforcement"
        tone="amber"
        primaryAction={{ label: "+ Issue Pass", onClick: () => setShowForm(true) }}
      />

      {stats && (
        <StatGrid cols={5}>
          <StatCard label="Currently inside" value={stats.currentlyInside} tone="emerald" icon="🟢" />
          <StatCard label="Today — checked in" value={stats.todayIn} tone="sky" icon="📥" />
          <StatCard label="Today — checked out" value={stats.todayOut} tone="indigo" icon="📤" />
          <StatCard label="Overstaying" value={stats.overstay} tone={stats.overstay > 0 ? "rose" : "teal"} icon="⏰" />
          <StatCard label="Blacklisted" value={stats.blacklisted} tone={stats.blacklisted > 0 ? "rose" : "slate"} icon="🚫" />
        </StatGrid>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        <TabBtn active={tab === "live"} onClick={() => setTab("live")}>
          Inside Now
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
          All Passes
        </TabBtn>
        <TabBtn active={tab === "blacklist"} onClick={() => setTab("blacklist")}>
          Blacklist ({blacklist.filter((b) => b.active).length})
        </TabBtn>
      </div>

      {(tab === "live" || tab === "history") && (
        <Section>
          {tab === "history" && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PassStatus | "")}
                className="inp"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value as VisitPurpose | "")}
                className="inp"
              >
                <option value="">All purposes</option>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={overstayOnly}
                  onChange={(e) => setOverstayOnly(e.target.checked)}
                />
                Overstay only
              </label>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
          ) : passes.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              {tab === "live" ? "No visitors inside." : "No passes yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Badge</th>
                    <th className="py-2 pr-3">Visitor</th>
                    <th className="py-2 pr-3">Purpose</th>
                    <th className="py-2 pr-3">Host / patient</th>
                    <th className="py-2 pr-3">Check-in</th>
                    <th className="py-2 pr-3">Expected out</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {passes.map((p) => (
                    <PassRow
                      key={p.id}
                      pass={p}
                      expanded={expanded === p.id}
                      onToggle={() =>
                        setExpanded(expanded === p.id ? null : p.id)
                      }
                      onCheckOut={() => checkOut(p.id)}
                      onDelete={() => deletePass(p.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "blacklist" && (
        <Section>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowBlacklistForm(true)}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              + Add to blacklist
            </button>
          </div>
          {blacklist.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No blacklisted visitors.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">ID proof</th>
                    <th className="py-2 pr-3">Reason</th>
                    <th className="py-2 pr-3">Banned</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blacklist.map((b) => (
                    <tr key={b.id} className={b.active ? "" : "opacity-50"}>
                      <td className="py-2 pr-3 font-medium text-slate-800">{b.name}</td>
                      <td className="py-2 pr-3 text-slate-600">{b.phone || "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{b.idProofNumber || "—"}</td>
                      <td className="py-2 pr-3 text-slate-700">{b.reason}</td>
                      <td className="py-2 pr-3 text-xs text-slate-500">
                        {new Date(b.bannedAt).toLocaleDateString()}
                        {b.bannedBy && <div>by {b.bannedBy}</div>}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                            b.active ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {b.active ? "Active" : "Lifted"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleBlacklist(b.id, !b.active)}
                            className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                          >
                            {b.active ? "Lift" : "Reactivate"}
                          </button>
                          <button
                            onClick={() => deleteBL(b.id)}
                            className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {showForm && (
        <IssuePassModal
          patients={patients}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {showBlacklistForm && (
        <BlacklistModal
          onClose={() => setShowBlacklistForm(false)}
          onSaved={() => {
            setShowBlacklistForm(false);
            load();
          }}
        />
      )}

      <style jsx>{`
        .inp {
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .inp:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(191 219 254 / 0.4);
        }
      `}</style>
    </div>
  );
}

function PassRow({
  pass,
  expanded,
  onToggle,
  onCheckOut,
  onDelete,
}: {
  pass: VisitorPass;
  expanded: boolean;
  onToggle: () => void;
  onCheckOut: () => void;
  onDelete: () => void;
}) {
  const overstay =
    pass.status === "checked_in" &&
    pass.expectedOutAt &&
    new Date(pass.expectedOutAt).getTime() < Date.now();

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-slate-50 ${overstay ? "bg-rose-50/50" : ""}`}
        onClick={onToggle}
      >
        <td className="py-2 pr-3">
          <span className="rounded bg-indigo-100 px-2 py-1 font-mono text-xs font-bold text-indigo-800">
            {pass.badgeNumber}
          </span>
        </td>
        <td className="py-2 pr-3">
          <div className="font-medium text-slate-800">{pass.visitorName}</div>
          <div className="text-[11px] text-slate-500">
            {pass.phone || "—"}
            {pass.idProofType && pass.idProofNumber
              ? ` · ${ID_LABEL[pass.idProofType]} ${pass.idProofNumber}`
              : ""}
          </div>
        </td>
        <td className="py-2 pr-3">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${PURPOSE_COLOR[pass.purpose]}`}>
            {PURPOSE_LABEL[pass.purpose]}
          </span>
        </td>
        <td className="py-2 pr-3 text-xs text-slate-700">
          {pass.patientName && <div>Patient: {pass.patientName}</div>}
          {pass.hostName && <div>Host: {pass.hostName}</div>}
          {pass.department && <div className="text-slate-500">{pass.department}</div>}
          {!pass.patientName && !pass.hostName && !pass.department && "—"}
        </td>
        <td className="py-2 pr-3 text-xs text-slate-600">
          {new Date(pass.checkInAt).toLocaleString()}
        </td>
        <td className={`py-2 pr-3 text-xs ${overstay ? "font-semibold text-rose-700" : "text-slate-600"}`}>
          {pass.expectedOutAt ? new Date(pass.expectedOutAt).toLocaleString() : "—"}
          {overstay && <div className="text-[10px] font-semibold">OVERSTAY</div>}
        </td>
        <td className="py-2 pr-3">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[pass.status]}`}>
            {pass.status === "checked_in" ? "Inside" : pass.status === "checked_out" ? "Out" : "Expired"}
          </span>
        </td>
        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {pass.status === "checked_in" && (
              <button
                onClick={onCheckOut}
                className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                Check Out
              </button>
            )}
            <button
              onClick={onDelete}
              className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
            >
              Del
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={8} className="px-3 py-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KV k="Pass #" v={pass.passNumber} />
              <KV k="Checked out" v={pass.checkOutAt ? new Date(pass.checkOutAt).toLocaleString() : "—"} />
              <KV
                k="Duration"
                v={
                  pass.checkOutAt
                    ? formatDuration(new Date(pass.checkOutAt).getTime() - new Date(pass.checkInAt).getTime())
                    : pass.status === "checked_in"
                    ? formatDuration(Date.now() - new Date(pass.checkInAt).getTime()) + " (ongoing)"
                    : "—"
                }
              />
              <KV k="ID proof" v={pass.idProofType ? `${ID_LABEL[pass.idProofType]} — ${pass.idProofNumber || "—"}` : "—"} />
            </div>
            {pass.notes && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Notes</div>
                <div className="mt-1 text-sm text-slate-700">{pass.notes}</div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function IssuePassModal({
  patients,
  onClose,
  onSaved,
}: {
  patients: Patient[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    visitorName: "",
    phone: "",
    idProofType: "aadhaar" as IdProofType,
    idProofNumber: "",
    purpose: "patient_visit" as VisitPurpose,
    patientId: "",
    hostName: "",
    department: "",
    expectedOutAt: "",
    notes: "",
  });
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    if (!form.visitorName.trim()) {
      setErr("Visitor name required");
      return;
    }
    const body: Record<string, unknown> = { ...form };
    if (form.patientId) {
      const p = patients.find((x) => x.id === form.patientId);
      if (p) body.patientName = `${p.firstName} ${p.lastName}`;
    }
    if (form.expectedOutAt) {
      body.expectedOutAt = new Date(form.expectedOutAt).toISOString();
    }
    const res = await fetch("/api/hospital/visitors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      if (d.error === "blacklisted") {
        setErr(`🚫 Blacklisted: ${d.blacklistReason || "—"}`);
      } else {
        setErr(d.error || "Failed");
      }
    }
  }

  return (
    <Modal onClose={onClose} title="Issue visitor pass">
      <div className="space-y-3">
        {err && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {err}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Visitor name">
            <input
              type="text"
              value={form.visitorName}
              onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
              className="inp w-full"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="inp w-full"
            />
          </Field>
          <Field label="ID proof type">
            <select
              value={form.idProofType}
              onChange={(e) =>
                setForm({ ...form, idProofType: e.target.value as IdProofType })
              }
              className="inp w-full"
            >
              {ID_TYPES.map((t) => (
                <option key={t} value={t}>{ID_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="ID number">
            <input
              type="text"
              value={form.idProofNumber}
              onChange={(e) => setForm({ ...form, idProofNumber: e.target.value })}
              className="inp w-full"
            />
          </Field>
          <Field label="Purpose">
            <select
              value={form.purpose}
              onChange={(e) =>
                setForm({ ...form, purpose: e.target.value as VisitPurpose })
              }
              className="inp w-full"
            >
              {PURPOSES.map((p) => (
                <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>
              ))}
            </select>
          </Field>
          <Field label="Expected out">
            <input
              type="datetime-local"
              value={form.expectedOutAt}
              onChange={(e) => setForm({ ...form, expectedOutAt: e.target.value })}
              className="inp w-full"
            />
          </Field>
          {form.purpose === "patient_visit" && (
            <Field label="Visiting patient">
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="inp w-full"
              >
                <option value="">— Select patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Host name">
            <input
              type="text"
              value={form.hostName}
              onChange={(e) => setForm({ ...form, hostName: e.target.value })}
              className="inp w-full"
              placeholder="Dr. / Manager"
            />
          </Field>
          <Field label="Department">
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="inp w-full"
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="inp min-h-[60px] w-full"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Issue Pass
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BlacklistModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    idProofNumber: "",
    reason: "",
    bannedBy: "",
  });

  async function save() {
    if (!form.name.trim() || !form.reason.trim()) {
      alert("Name and reason required");
      return;
    }
    const res = await fetch("/api/hospital/visitors/blacklist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) onSaved();
    else alert("Failed");
  }

  return (
    <Modal onClose={onClose} title="Blacklist visitor">
      <div className="space-y-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-700">
          Any future pass attempt matching by name, phone, or ID number will be blocked at issuance.
        </div>
        <Field label="Name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="inp w-full"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="inp w-full"
            />
          </Field>
          <Field label="ID number">
            <input
              type="text"
              value={form.idProofNumber}
              onChange={(e) => setForm({ ...form, idProofNumber: e.target.value })}
              className="inp w-full"
            />
          </Field>
        </div>
        <Field label="Reason">
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="inp min-h-[70px] w-full"
          />
        </Field>
        <Field label="Banned by">
          <input
            type="text"
            value={form.bannedBy}
            onChange={(e) => setForm({ ...form, bannedBy: e.target.value })}
            className="inp w-full"
            placeholder="Security officer"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Add to blacklist
          </button>
        </div>
      </div>
    </Modal>
  );
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function Stat({
  label,
  value,
  sub,
  color = "slate",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "slate" | "emerald" | "amber" | "rose" | "blue";
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5">{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="text-sm text-slate-800">{v}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-primary-500 text-primary-700"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
