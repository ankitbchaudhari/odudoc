"use client";

import { useCallback, useEffect, useState } from "react";

type OrgPlan = "trial" | "starter" | "clinic" | "hospital" | "enterprise";
type OrgStatus = "active" | "suspended" | "cancelled";

interface OrgModules {
  patient: boolean;
  opd: boolean;
  ipd: boolean;
  lab: boolean;
  pharmacy: boolean;
  billing: boolean;
  surgery: boolean;
  inventory: boolean;
  radiology: boolean;
  telemedicine: boolean;
  aiVoice: boolean;
}

interface Organization {
  id: string;
  slug: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  country: string;
  plan: OrgPlan;
  status: OrgStatus;
  modules: OrgModules;
  trialEndsAt?: string;
  createdAt: string;
}

const PLANS: OrgPlan[] = ["trial", "starter", "clinic", "hospital", "enterprise"];
const STATUSES: OrgStatus[] = ["active", "suspended", "cancelled"];

const MODULE_LABELS: Record<keyof OrgModules, string> = {
  patient: "Patient Mgmt",
  opd: "OPD",
  ipd: "IPD",
  lab: "Lab",
  pharmacy: "Pharmacy",
  billing: "Billing",
  surgery: "Surgery / OT",
  inventory: "Inventory",
  radiology: "Radiology",
  telemedicine: "Telemedicine",
  aiVoice: "AI Voice",
};

const PLAN_COLORS: Record<OrgPlan, string> = {
  trial: "bg-gray-100 text-gray-700",
  starter: "bg-sky-100 text-sky-700",
  clinic: "bg-emerald-100 text-emerald-700",
  hospital: "bg-indigo-100 text-indigo-700",
  enterprise: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<OrgStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const DEFAULT_MODULES: OrgModules = {
  patient: true,
  opd: true,
  ipd: false,
  lab: false,
  pharmacy: false,
  billing: false,
  surgery: false,
  inventory: false,
  radiology: false,
  telemedicine: true,
  aiVoice: false,
};

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    plan: "trial" as OrgPlan,
    status: "active" as OrgStatus,
    modules: { ...DEFAULT_MODULES },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/organizations", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setOrgs(data.organizations || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      name: "",
      contactEmail: "",
      contactPhone: "",
      country: "",
      plan: "trial",
      status: "active",
      modules: { ...DEFAULT_MODULES },
    });
    setEditingId(null);
  };

  const handleEdit = (o: Organization) => {
    setForm({
      name: o.name,
      contactEmail: o.contactEmail,
      contactPhone: o.contactPhone || "",
      country: o.country,
      plan: o.plan,
      status: o.status,
      modules: { ...o.modules },
    });
    setEditingId(o.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactEmail.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch("/api/organizations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this organization and all its memberships?")) return;
    await fetch("/api/organizations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  const toggleModule = (key: keyof OrgModules) => {
    setForm({ ...form, modules: { ...form.modules, [key]: !form.modules[key] } });
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
          <p className="mt-1 text-sm text-gray-500">
            {orgs.length} tenants · {orgs.filter((o) => o.status === "active").length} active
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Organization
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Organization" : "Add Organization"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Apollo Hospitals Hyderabad"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value as OrgPlan })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm capitalize outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as OrgStatus })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm capitalize outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Enabled modules</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODULE_LABELS) as (keyof OrgModules)[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleModule(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      form.modules[key]
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-300 bg-white text-gray-500 hover:border-indigo-300"
                    }`}
                  >
                    {MODULE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Modules</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const enabledCount = Object.values(o.modules).filter(Boolean).length;
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.name}</p>
                      <p className="text-xs text-gray-400">{o.slug} · {o.country || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{o.contactEmail}</p>
                      {o.contactPhone && <p className="text-xs text-gray-400">{o.contactPhone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_COLORS[o.plan]}`}>
                        {o.plan}
                      </span>
                      {o.trialEndsAt && o.plan === "trial" && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          ends {new Date(o.trialEndsAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {enabledCount} / {Object.keys(o.modules).length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(o)}
                          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(o.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && orgs.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No organizations yet.</div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>
    </div>
  );
}
